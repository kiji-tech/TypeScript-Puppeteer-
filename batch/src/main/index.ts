import { Browser, Page } from "puppeteer";

const puppeteer = require('puppeteer');
const target_url = "https://info.finance.yahoo.co.jp/ranking/?kd=8&mk=1&tm=d&vl=a";


class Company {
    code     : string = '';
    market   : string = '';
    name     : string = '';
    value    : string = '';
    dividend : string = '';
    rate     : string = '';

}


(async () => {
    // browserを立ち上げる
    let browser;
    // page(tab)を生成する
    let page;
    
    try {
        browser = await puppeteer.launch() as Browser;
        page    = await browser.newPage() as Page;
        
        // 特定のURLへ移動する｡
        // ページ読み込みができるまで待つ
        await Promise.all([
            page.goto(target_url),
            page.waitForNavigation({ 'waitUntil' : 'domcontentloaded', 'timeout' : 30000 })
        ]);
    
        // 遷移先のページ確認
        let dom = await page.content();
        if( dom.indexOf("rankingTableWrapper") < 0 ) {
            throw new Error( "ページ遷移 失敗" );
        }
        let result_list : Company[] = [];

        while( true ) {
            // ページ内の銘柄表を取得
            const company_list = await page.$$('div.rankingTableWrapper > table > tbody > tr');

            // 1行ずつ処理をする
            for(let company of company_list) {
                // コードのラベルを取得
                let c = new Company();
                const code_item = await company.$("td:nth-child(2) > a");
                if( code_item ) {
                    const item = await code_item.getProperty('textContent');
                    if( item )
                        c.code = await item.jsonValue();
                }
                
                // 市場のラベルを取得
                const market_item = await company.$("td:nth-child(3)");
                if( market_item ) {
                    const item = await market_item.getProperty('textContent');
                    if( item )
                        c.market = await item.jsonValue();
                }

                // 名称のラベルを取得
                const name_item = await company.$("td:nth-child(4)");
                if( name_item ) {
                    const item = await name_item.getProperty('textContent');
                    if( item )
                    c.name = await item.jsonValue();
                }
                
                // 取引値のラベルを取得
                const value_item = await company.$("td:nth-child(6)");
                if( value_item ) {
                    const item = await value_item.getProperty('textContent');
                    if( item )
                    c.value = await item.jsonValue();
                }

                // 1株配当のラベルを取得
                const dividend_item = await company.$("td:nth-child(8)");
                if( dividend_item ) {
                    const item = await dividend_item.getProperty('textContent');
                    if( item )
                    c.dividend = await (item).jsonValue();
                }

                // 配当利回りのラベルを取得
                const rate_item = await company.$("td:nth-child(9)");
                if( rate_item ) {
                    const item = await rate_item.getProperty('textContent');
                    if( item )
                        c.rate = await (item).jsonValue();
                }
                console.log(JSON.stringify(c)); 
            }

            // 次が取得
            const next_btn = await page.$("ul.ymuiPagingBottom > a:last-child");
            if( next_btn ) {
                // 次のページがある場合は画面遷移
                // 表示されるまで待つ
                await Promise.all([
                    page.waitForNavigation({ 'waitUntil' : 'domcontentloaded', 'timeout' : 30000 }),
                    next_btn.click()
                ]);

            } else {
                break;
            }
        }
    
    } catch( e ) {
        console.error( e );
    } finally {
        // browserを閉じる
        if( browser ) {
            await browser.close();
            browser = undefined;
        }

    }

})();


