import json, os, threading, http.server, socketserver, urllib.parse, datetime
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(__file__), '..', 'web')
BASE = 'https://cpycfxolqpidfjbhhsmr.supabase.co'
USER_ID = 'afb13088-3632-4f50-a8c4-b8bf9d9789df'
class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, p):
        return os.path.join(ROOT, urllib.parse.unquote(p.split('?')[0]).lstrip('/'))
    def do_GET(self):
        if self.path=='/api/config':
            blob = json.dumps({'url':BASE, 'project_ref':'cpycfxolqpidfjbhhsmr','anon_key':'TEST_PUBLIC'}).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(blob)));self.end_headers();self.wfile.write(blob)
        else:super().do_GET()
    def log_message(self, *_):pass
class Server(socketserver.TCPServer):allow_reuse_address=True
with Server(('127.0.0.1',0),Handler) as s:
    port=s.server_address[1];t=threading.Thread(target=s.serve_forever,daemon=True);t.start()
    store={'products':[],'lots':[],'sales':[],'images':[]}
    def serve_api(route):
        path=urllib.parse.urlsplit(route.request.url).path
        method=route.request.method
        if path.endswith('/auth/v1/token'):
            return route.fulfill(status=200,content_type='application/json',body=json.dumps({'access_token':'abc.jwt','refresh_token':'test_refresh','expires_in':3600,'user':{'id':USER_ID,'email':'test@example.at'}}))
        if path.endswith('/auth/v1/user'):
            return route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':USER_ID,'email':'test@example.at'}))
        if path.endswith('/rest/v1/rpc/tc_is_authorized'):
            return route.fulfill(status=200,content_type='application/json',body='true')
        if path.endswith('/rest/v1/rpc/tc_book_purchase'):
            data=route.request.post_data_json
            store['lots'].append({'id':'lot-0001','product_id':data['p_product_id'],'bought_on':data['p_bought_on'],'purchased_qty':data['p_qty'],'available_qty':data['p_qty'],'purchase_total':float(data['p_purchase_total']),'extra_cost':float(data['p_extra_cost']),'allocated_cost':0,'source':data['p_source'],'created_at':'2026-10-15T08:00:00Z'})
            return route.fulfill(status=200,content_type='application/json',body='"lot-0001"')
        if path.endswith('/rest/v1/rpc/tc_book_sale'):
            data=route.request.post_data_json
            assert data['p_qty']==1
            assert data['p_price']=='150.00'
            store['lots'][0]['available_qty']-=1
            store['lots'][0]['allocated_cost']+=100
            store['sales'].append({'id':'sale-0001','product_id':data['p_product_id'],'sold_on':data['p_sold_on'],'qty':data['p_qty'],'price':float(data['p_price']),'shipping_income':0,'shipping_cost':0,'fees':0,'other_cost':0,'cogs_total':100,'platform':'eBay','status':'booked','created_at':'2026-10-15T08:00:00Z'})
            return route.fulfill(status=200,content_type='application/json',body='"sale-0001"')
        if path.endswith('/rest/v1/tc_products'):
            if method=='POST':
                data=route.request.post_data_json;data['id']='prod-0001';store['products'].append(data)
                return route.fulfill(status=201,content_type='application/json',body='[]')
            if method=='PATCH':
                data=route.request.post_data_json;store['products'][0].update(data)
                return route.fulfill(status=204,body='')
            return route.fulfill(status=200,content_type='application/json',body=json.dumps(store['products']))
        if path.endswith('/rest/v1/tc_inventory'):
            stock=[{'product_id':p['id'],'available_qty':sum(l['available_qty'] for l in store['lots'] if l['product_id']==p['id']),'remaining_cost':sum(l['purchase_total']+l['extra_cost']-l['allocated_cost'] for l in store['lots'] if l['product_id']==p['id'])} for p in store['products']]
            return route.fulfill(status=200,content_type='application/json',body=json.dumps(stock))
        if path.endswith('/rest/v1/tc_purchase_lots'):
            return route.fulfill(status=200,content_type='application/json',body=json.dumps(store['lots']))
        if path.endswith('/rest/v1/tc_sales'):
            return route.fulfill(status=200,content_type='application/json',body=json.dumps(store['sales']))
        if path.endswith('/rest/v1/tc_lot_images'):
            return route.fulfill(status=200,content_type='application/json',body='[]')
        return route.fulfill(status=404,content_type='application/json',body='{"message":"unknown route"}')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,locale='de-AT')
        logs=[];page.on('pageerror',lambda err:logs.append(str(err)))
        page.route(BASE+'/**',serve_api)
        page.goto(f'http://127.0.0.1:{port}/')
        assert page.locator('#loginScreen').is_visible(), 'login screen missing'
        page.fill('#email','test@example.at');page.fill('#password','testpass')
        page.locator('#signInBtn').click()
        page.locator('#page-home').wait_for(state='visible')
        page.locator('[data-go="article"]').first.click()
        page.locator('#articleForm [name="name"]').fill('Delta Herrschaft')
        page.locator('#articleForm [name="sku"]').fill('DEL-001')
        page.locator('#articleSubmit').click()
        page.locator('#page-home').wait_for(state='visible')
        assert 'Delta Herrschaft' in page.locator('#productsList').inner_text()
        page.locator('#bottomNav [data-go="purchase"]').click()
        page.select_option('#purchaseForm [name="product"]','prod-0001')
        page.locator('#purchaseForm [name="qty"]').fill('2')
        page.locator('#purchaseForm [name="unit"]').fill('100')
        assert page.locator('#purchaseForm [name="total"]').input_value()=='200,00', 'unit to total calculation failed'
        page.locator('#purchaseForm button[type="submit"]').click()
        page.locator('#page-home').wait_for(state='visible')
        assert '2 Stk.' in page.locator('#productsList').inner_text()
        page.locator('#bottomNav [data-go="sale"]').click()
        page.select_option('#saleForm [name="product"]','prod-0001')
        page.locator('#saleForm [name="qty"]').fill('1')
        page.locator('#saleForm [name="price"]').fill('150,00')
        assert '50,00' in page.locator('#salePreview').inner_text(), page.locator('#salePreview').inner_text()
        page.locator('#saleForm button[type="submit"]').click()
        page.locator('#page-sales').wait_for(state='visible')
        assert len(store['sales'])==1
        page.locator('#bottomNav [data-go="home"]').click()
        assert '1 Stk.' in page.locator('#productsList').inner_text()
        assert not logs,logs
        print('PASS: 390px mobile viewport, login, article create, price link, FIFO purchase, sale, 50 EUR profit, refreshed remaining stock')
        page.screenshot(path='/mnt/data/trummcards_mobile_test/mobile-test-ui.png',full_page=True)
        browser.close()
    s.shutdown()
