#!/usr/bin/env python3
"""Full v3.4 browser gate; run with mono-base/ served on 127.0.0.1:8765."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:8765'
PAGES=('index','aircraft','robotics','space','design-lab','technology','journal','about','cad-viewer')
OUT=Path('mono-base-qa-artifacts')
OUT.mkdir(exist_ok=True)

def validate_site(browser,name,viewport):
    page=browser.new_page(viewport=viewport,device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    for path in PAGES[:-1]:
        page.goto(f'{BASE}/{path}.html',wait_until='domcontentloaded')
        assert page.locator('h1').count()==1,f'{name}: {path} missing H1'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),f'{name}: {path} horizontal overflow'
        for image in page.locator('img').all():
            image.scroll_into_view_if_needed()
            image.evaluate("el => {el.loading='eager'}")
            expect(image).to_have_js_property('complete',True,timeout=15000)
            assert image.evaluate('(el)=>el.naturalWidth>0'),f'{name}: {path} image failed'
        if path == 'design-lab':
            embedded = page.locator('#cad-frame')
            expect(embedded).to_have_count(1)
            embedded.scroll_into_view_if_needed()
            inner = page.frame_locator('#cad-frame')
            expect(inner.locator('#status')).to_contain_text('ENGINE ONLINE',timeout=45000)
            page.wait_for_function("""() => {
                const f=document.getElementById('cad-frame');
                const footer=document.querySelector('body > footer');
                const b=f?.contentDocument?.body;
                if (!b || !footer) return false;
                const height=b.getBoundingClientRect().height;
                const fits=f.getBoundingClientRect().height >= height-3;
                const ordered=(f.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING)!==0;
                return fits && ordered;
            }""",timeout=20000)
        if path in ('index','design-lab'):
            page.screenshot(path=str(OUT/f'{path}-v34-{name}.png'),full_page=True)
    page.goto(f'{BASE}/design-lab.html',wait_until='domcontentloaded')
    frame_element=page.locator('iframe[src$="cad-viewer.html"]')
    expect(frame_element).to_have_count(1)
    frame_element.scroll_into_view_if_needed()
    frame=page.frame_locator('iframe[src$="cad-viewer.html"]')
    expect(frame.locator('#status')).to_contain_text('ENGINE ONLINE',timeout=45000)
    canvas=frame.locator('canvas#viewport')
    expect(canvas).to_be_visible()
    assert canvas.evaluate('(el)=>el.width>0 && el.height>0'),f'{name}: WebGL canvas invalid'
    assert canvas.get_attribute('tabindex')=='0',f'{name}: keyboard access missing'
    frame.locator('#sweep').evaluate("el => {el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}))}")
    expect(frame.locator('#sweepValue')).to_have_text('35°')
    frame.locator('[data-mode="wire"]').click()
    expect(frame.locator('[data-mode="wire"]')).to_have_class('active')
    frame.locator('[data-view="top"]').click()
    expect(frame.locator('[data-view="top"]')).to_have_class('active')
    canvas.focus()
    page.keyboard.press('ArrowLeft')
    page.keyboard.press('Equal')
    page.keyboard.press('Home')
    expect(frame.locator('#sweepValue')).to_have_text('20°')
    expect(frame.locator('[data-mode="solid"]')).to_have_class('active')
    assert not errors,f'{name}: JS errors: {errors}'
    page.close()
    print(f'PASS v3.4 {name}: 8 pages, original images, no overflow, 3D interaction')

def validate_dependency_failure(browser):
    page=browser.new_page()
    page.route('**/three.module.js',lambda route:route.abort())
    page.goto(BASE+'/cad-viewer.html',wait_until='domcontentloaded')
    expect(page.locator('#viewer-fallback')).to_be_visible(timeout=20000)
    expect(page.locator('#reset')).to_be_disabled()
    print('PASS v3.4: Three.js dependency failure fallback and disabled controls')
    page.close()

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    for name,viewport in (
        ('desktop',{'width':1440,'height':900}),
        ('mobile',{'width':390,'height':844}),
        ('small',{'width':320,'height':740}),
    ):
        validate_site(browser,name,viewport)
    validate_dependency_failure(browser)
    browser.close()
