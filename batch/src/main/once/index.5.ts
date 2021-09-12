import { Browser, HTTPRequest, Page } from "puppeteer";

const puppeteer = require('puppeteer');
const target_url = "https://info.finance.yahoo.co.jp/ranking/?kd=8&mk=1&tm=d&vl=a";

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

        // HTTPリクエスト イベントが発生したら｡
        page.setRequestInterception( true );
        page.on('request', ( req : HTTPRequest ) => {
            if( req.resourceType()  == 'image' ) {
                req.abort().catch( e => { console.error( e ); });
            } else {
                req.continue().catch( e => { console.error( e ); });
            }
        });
        
        // 特定のURLへ移動する｡
        // ページ読み込みができるまで待つ
        await Promise.all([
            page.waitForNavigation({ 'waitUntil' : 'domcontentloaded', 'timeout' : 30000 }),
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
            page.waitForNavigation({ 'waitUntil' : 'networkidle0', 'timeout' : 30000 }),
            search_btn?.click()
        ]);
        
 
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