import { Browser, Page } from "puppeteer";
import { Company } from './company';

const puppeteer = require('puppeteer');
const target_url = "https://info.finance.yahoo.co.jp/ranking/?kd=8&mk=1&tm=d&vl=a";


( async () => {
    // browserを立ち上げる
    let browser;
    // page(tab)を生成する
    let page;
    
    try {
        browser = await puppeteer.launch({'headless' : true, 'slowMo' : 0}) as Browser;
        page    = await browser.newPage() as Page;
        
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
  
        while( true ) {
            // ページ内の銘柄表を取得
            const company_list : Company[] = 
            await page.$$eval('#contents-body-bottom > div.rankdata > div.rankingTableWrapper > table > tbody > tr', ( company_selector_list => company_selector_list.map( company => {
                let c = {} as Company;
                console.log( c );

                // コードのラベルを取得
                const code_item = company.querySelector("td:nth-child(2) > a") as HTMLLinkElement;
                if( code_item ) {
                    c.code = code_item.innerHTML;
                    c.detail_page = code_item.href;
                }

                // 市場のラベルを取得
                const market_item = company.querySelector("td:nth-child(3)") as HTMLElement;
                if( market_item ) {
                    c.market = market_item.innerHTML;
                }
                
                // 名称のラベルを取得
                const name_item = company.querySelector("td:nth-child(4)") as HTMLElement;
                if( name_item ) {
                    c.name = name_item.innerHTML;
                }
                
                // 取引値のラベルを取得
                const value_item = company.querySelector("td:nth-child(6)") as HTMLElement;
                if( value_item ) {
                    c.value = value_item.innerHTML;
                }

                // 1株配当のラベルを取得
                const dividend_item = company.querySelector("td:nth-child(8)") as HTMLElement;
                if( dividend_item ) {
                    c.dividend = dividend_item.innerHTML;
                }

                // 配当利回りのラベルを取得
                const rate_item = company.querySelector("td:nth-child(8)") as HTMLElement;
                if( rate_item ) {
                    c.rate = rate_item.innerHTML;
                }
                return c;
            })));

            // 1行ずつ処理をする
            for(let c of company_list) {
                // 詳細ページへ画面遷移
                await Promise.all([
                    page.waitForNavigation({'waitUntil' : 'networkidle2', 'timeout' : 30000 }),
                    page.goto( c.detail_page )
                ]);

                // 業種のラベルを取得
                try {
                    c.sector = await page.$eval('div#industry > a', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.sector = '';
                }

                //PERのラベルを取得
                try {
                    c.per = await page.$eval('#referenc > div > ul > li:nth-child(5) > dl > dd > a > span._1fofaCjs._2aohzPlv._1DMRub9m > span > span._3rXWJKZF._11kV6f2G', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.per = '';
                }

                //PBRのラベルを取得
                try {
                    c.pbr = await page.$eval('#referenc > div > ul > li:nth-child(6) > dl > dd > a > span._1fofaCjs._2aohzPlv._1DMRub9m > span > span._3rXWJKZF._11kV6f2G', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.pbr = '';
                }

                //EPSのラベルを取得
                try {
                    c.eps = await page.$eval('#referenc > div > ul > li:nth-child(7) > dl > dd > span._1fofaCjs._2aohzPlv._1DMRub9m > span > span._3rXWJKZF._11kV6f2G', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.eps = '';
                }

                //BPSのラベルを取得
                try {
                    c.bps = await page.$eval('#referenc > div > ul > li:nth-child(8) > dl > dd > span._1fofaCjs._2aohzPlv._1DMRub9m > span > span._3rXWJKZF._11kV6f2G', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.bps = '';
                }

                //単元株数のラベルを取得
                try {
                    c.num = await page.$eval('#referenc > div > ul > li:nth-child(10) > dl > dd > span > span > span._3rXWJKZF._11kV6f2G', (element => {
                        return element.innerHTML;
                    }));
                } catch ( e ) {
                    c.num = '';
                }

                // 取得したら前のページに戻る
                await Promise.all([
                    page.waitForNavigation({'waitUntil': 'networkidle2','timeout' : 30000 }),
                    page.goBack()
                ]);
                console.log(c); 
            }

            const next_btn = await page.$("ul.ymuiPagingBottom > a:last-child");
            if( next_btn ) {
                // 次のページがある場合は画面遷移
                // 表示されるまで待つ
                await Promise.all([
                    page.waitForNavigation({ 'waitUntil' : 'networkidle0', 'timeout' : 30000 }),
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
})( );