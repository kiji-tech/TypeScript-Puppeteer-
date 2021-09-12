import { request } from "http";
import { basename } from "path";
import { Browser, HTTPRequest, HTTPResponse, Page } from "puppeteer";

const puppeteer = require('puppeteer');
const target_url = "https://info.finance.yahoo.co.jp/ranking/?kd=8&mk=1&tm=d&vl=a";

const fs = require('fs');
const sleep = async (ms : number) => new Promise(resolve => setTimeout(resolve, ms));

( async () => {
    // browserを立ち上げる
    let browser;
    // page(tab)を生成する
    let page;
    
    try {
        browser = await puppeteer.launch({
            'headless' : false,
            'slowMo' : 100,
            'args': [ `--window-size=1200,800` ],
            'defaultViewport': {
                'width':1200,
                'height':800
            }
        }) as Browser;
        page    = await browser.newPage() as Page;

        // await page.setCacheEnabled( false ).catch( e => { console.error( e ); });

        await page.setRequestInterception( true );

        const FILE_PATH = './cache/'
        page.on('request', (req : HTTPRequest) => {
            let url = req.url();
            let file_name = basename(url);

            // ローカルのキャッシュがある
            if( fs.existsSync(`${FILE_PATH}${file_name}`) ) {
                // キャッシュ期限内の場合
                let cache  : any = JSON.parse(fs.readFileSync(`${FILE_PATH}${file_name}`));
                if( cache && cache.expires > Date.now() ) {
                    req.respond( cache ).catch( e => { console.error( e ) });
                    return;
                }
            // 上記以外は通常
            } else {
                req.continue();
            }
        });

        page.on('response', async (res : HTTPResponse) => {
            let url = res.url();
            let file_name = basename(url);
            let cache  : any = { };

            if( fs.existsSync(`${FILE_PATH}${file_name}`)) {
                cache = JSON.parse(fs.readFileSync(`${FILE_PATH}${file_name}`));
            }

            // 有効期限内にキャッシュがある場合はリターン
            if( cache && cache.expires > Date.now() ) {
                return;
            }
    
            // 画像ファイルの場合はキャッシュする
            if( file_name.indexOf('.js') >= 0 && ( res.status() >= 200 && res.status() <= 304 ) ) {

                let buffer;
                try {
                    buffer = await res.buffer().catch( e => console.error( e )) as Buffer;
                } catch ( e ) {
                    console.error( e );
                    return;
                }  
                cache = {
                    'status'  : res.status()
                    , 'headers' : res.headers()
                    , 'body'    : buffer.toString()
                    , 'expires' : Date.now() + 3600 * 1000
                };
                fs.writeFileSync(`${FILE_PATH}${file_name}`, JSON.stringify(cache));


            } else {
                return;
            }
        });

        
        // 特定のURLへ移動する｡
        // ページ読み込みができるまで待つ
        await Promise.all([
            page.waitForNavigation({ 'waitUntil' : 'domcontentloaded', 'timeout' : 60000 }),
            page.goto(target_url)
        ]);

        // 遷移先のページ確認
        let dom = await page.content();
        if( dom.indexOf("rankingTableWrapper") < 0 ) {
            throw new Error( "ページ遷移 失敗" );
        }

        // 入力フォームの取得
        await page.type("#searchText", "7203");

        // 検索ボタンの押下
        const search_btn = await page.$("#searchButton");
        await Promise.all([
            page.waitForNavigation({ 'waitUntil' : 'networkidle2', 'timeout' : 60000 }),
            search_btn?.click()
        ]);
        
        await sleep(10000);

    } catch( e ) {
        console.error( e );
    } finally {
        // browserを閉じる
        if( browser ) {
            await browser.close();
            browser = undefined;
        }
    }
})( );