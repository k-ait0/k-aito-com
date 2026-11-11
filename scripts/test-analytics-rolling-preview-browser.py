from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'QA_BROWSER_V0_5.txt'
records=[]
def check(name, ok, detail=''):
    records.append((name, bool(ok), detail))
    assert ok, f'{name} {detail}'
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/lab/analytics/rolling-preview.html'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width in (390,820,1366):
            page=browser.new_page(viewport={'width':width,'height':900})
            failures=[];outbound=[]
            page.on('pageerror',lambda e:failures.append(str(e)))
            page.on('request',lambda req:outbound.append(req.url) if not req.url.startswith('http://127.0.0.1:') else None)
            page.set_content((ROOT/'lab/analytics/rolling-preview.html').read_text(encoding='utf8'),wait_until='domcontentloaded')
            check(f'Chromium direct DOM {width}',True,'not an HTTP-origin E2E')
            page.wait_for_timeout(450)
            state=page.locator('#status').inner_text()
            check(f'boot {width}', '再計算済み' in state, state)
            check(f'no JS errors {width}',not failures,str(failures))
            check(f'no external traffic {width}',not outbound,str(outbound))
            check(f'no body overflow {width}',page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 1)
            check(f'chart paths {width}',page.locator('#plot path').count()==2)
            check(f'table populated {width}',page.locator('#window-rows tr').count()==25)
            check(f'research provenance {width}','仮想' in page.locator('.pill').inner_text())
            check(f'windows correct {width}',page.locator('#stat-windows').inner_text().startswith('241'))
            if width==390:
                page.locator('#next-page').click()
                check('pagination moves to page 2','26–50件' in page.locator('#page-count').inner_text())
                page.locator('#prev-page').click()
                check('pagination returns to page 1','1–25件' in page.locator('#page-count').inner_text())
                page.screenshot(path=str(ROOT/'rolling-preview-mobile.png'),full_page=True)
                original=page.locator('#stat-alt').inner_text()
                page.locator('#alt-expense').fill('12')
                check('stale indication','再計算してください' in page.locator('#status').inner_text())
                page.locator('#run').click()
                check('recompute changed funded count',page.locator('#stat-alt').inner_text()!=original)
                page.locator('#window-rows tr').nth(5).click()
                check('row selection',page.locator('#window-rows tr.selected').count()==1)
                check('row selection details',page.locator('#selected-month').inner_text().find(page.locator('#window-rows tr').nth(5).locator('td').first.inner_text())!=-1)
                page.locator('#pension-years').fill('18')
                page.locator('#run').click()
                check('invalid pension age blocked','計算保留' in page.locator('#error').inner_text())
                page.locator('#reset').click()
                check('reset recovers','再計算済み' in page.locator('#status').inner_text())
                page.locator('#gap').check()
                page.locator('#run').click()
                check('missing month excludes candidate windows',int(page.locator('#stat-excluded').inner_text().split('件')[0].replace(',',''))>0)
                page.locator('#years').select_option('10')
                page.locator('#run').click()
                check('gap plot splits',page.locator('#plot path').count()==2 and page.locator('#plot path').first.get_attribute('d').count(' M ')>1)
                page.locator('#market').select_option('shock')
                page.locator('#gap').uncheck()
                page.locator('#run').click()
                check('shock mode calculates','再計算済み' in page.locator('#status').inner_text())
                page.locator('#reset').click()
            if width==1366:
                page.screenshot(path=str(ROOT/'rolling-preview-desktop.png'),full_page=True)
            page.close()
        browser.close()
finally:
    server.shutdown()
REPORT.write_text('\n'.join(('PASS' if good else 'FAIL')+' '+name+((' — '+detail) if detail else '') for name,good,detail in records)+'\nTOTAL '+str(sum(ok for _,ok,_ in records))+'/'+str(len(records))+' PASS; localhost-origin E2E=BLOCKED_BY_ENVIRONMENT (not run / not passed)\n',encoding='utf8')
print(REPORT.read_text())
