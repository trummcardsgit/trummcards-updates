'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

function extract(start,end){
 const a=js.indexOf(start),b=js.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected function: '+start);
 return js.slice(a,b);
}
const thumbnailCode=extract('function prepareDesktopThumbnails(){','async function openDesktopProductImage(');
const previewCode=extract('async function showCurrentProductEditPhoto(productId){','function startProductEdit(id) {');
const viewerCode=extract('async function openDesktopProductImage(id){','function render() {');

function thumbnailHarness(withObserver=true){
 const loaded=[],cards=Array.from({length:28},(_,i)=>{
  const img={id:i,hidden:true};
  const card={visible:true,querySelector:sel=>sel==='img[data-inventory-thumb]'?img:null};
  img.closest=sel=>sel==='.inventory-thumb'?card:null;
  return {img,card};
 });
 let observer;
 class FakeIntersectionObserver{
  constructor(callback,options){this.callback=callback;this.options=options;this.targets=[];observer=this;}
  observe(target){this.targets.push(target);}
  unobserve(target){this.targets=this.targets.filter(t=>t!==target);}
  disconnect(){this.targets.length=0;}
  trigger(target){this.callback([{target,isIntersecting:true}]);}
 }
 const ctx={
  document:{querySelectorAll:()=>cards.map(x=>x.img)},
  window:withObserver?{IntersectionObserver:FakeIntersectionObserver}:{},
  IntersectionObserver:FakeIntersectionObserver,
  desktopThumbObserver:null,
  loadDesktopThumbnail:async img=>{loaded.push(img.id);}
 };
 vm.runInNewContext(thumbnailCode,ctx);
 ctx.prepareDesktopThumbnails();
 return {loaded,cards,get observer(){return observer;}};
}
test('first 24 Windows inventory thumbnails load without clicking or scrolling',()=>{
 const h=thumbnailHarness(true);
 assert.deepEqual(h.loaded,Array.from({length:24},(_,i)=>i));
 assert.equal(h.observer.targets.length,4);
 assert.equal(h.observer.options.rootMargin,'300px');
 assert.ok(h.observer.targets.every(x=>x.visible===true),'Observer must target visible card, never hidden IMG');
 h.observer.trigger(h.cards[24].card);
 assert.deepEqual(h.loaded,Array.from({length:25},(_,i)=>i));
 assert.equal(h.observer.targets.length,3);
});
test('missing IntersectionObserver loads all images immediately',()=>{
 const h=thumbnailHarness(false);
 assert.equal(h.loaded.length,28);
});
test('inventory rows contain a secure thumbnail button and a placeholder',()=>{
 assert.ok(js.includes('data-inventory-thumb='));
 assert.ok(js.includes('data-open-product-image='));
 assert.ok(js.includes('class="inventory-thumb no-photo"'));
 assert.ok(js.includes('if(img.nextElementSibling)img.nextElementSibling.hidden=true'));
 assert.ok(css.includes('.inventory-thumb img:not([hidden]) + .inventory-photo-placeholder'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(html.includes('<th>Bild</th>'));
});
test('clicking product image opens a large image with correct product name',async()=>{
 const image={src:''},caption={textContent:''};
 const dialog={open:false,showModal(){this.open=true;}};
 const elements={desktopViewerImage:image,desktopViewerCaption:caption,desktopImageViewer:dialog};
 const errors=[];
 const ctx={
  productImagePath:()=> 'private/123.jpg',
  productImageUrl:async()=> 'https://example.invalid/signed-image?token=TEST',
  productName:id=>id==='p1'?'Pikachu':'Unknown',
  $:id=>elements[id],
  flash:(...args)=>errors.push(args),
  L:{apiError:e=>String(e)}
 };
 vm.runInNewContext(viewerCode,ctx);
 await ctx.openDesktopProductImage('p1');
 assert.equal(dialog.open,true);
 assert.equal(caption.textContent,'Pikachu');
 assert.ok(image.src.includes('/signed-image'));
 assert.equal(errors.length,0);
});
test('editing a product previews existing photo without replacing it',async()=>{
 const image={src:'',hidden:true};
 const caption={textContent:''},zoom={hidden:true};
 const form={elements:{namedItem:()=>({value:'p1'})}};
 const elements={productImagePreview:image,productImageSelection:caption,productCurrentImageOpen:zoom,productForm:form};
 const ctx={
  productPreviewGeneration:0,productPhotoFile:null,
  productImagePath:()=> 'private/img.jpg',
  productImageUrl:async()=> 'https://example.invalid/signed-existing',
  getValue:(f,name)=>name==='edit_id'?f.elements.namedItem(name).value:'',
  $:id=>elements[id], L:{apiError:e=>String(e)}
 };
 vm.runInNewContext(previewCode,ctx);
 await ctx.showCurrentProductEditPhoto('p1');
 assert.equal(image.hidden,false);
 assert.ok(image.src.includes('signed-existing'));
 assert.equal(zoom.hidden,false);
 assert.ok(caption.textContent.includes('Aktuelles Artikelbild'));
 assert.equal(ctx.productPhotoFile,null);
});
test('async preview cannot overwrite an image newly selected during download',async()=>{
 let resolve;
 const pending=new Promise(r=>{resolve=r;});
 const image={src:'new-file',hidden:false},caption={textContent:'Neues Foto'},zoom={hidden:true};
 const form={elements:{namedItem:()=>({value:'p1'})}};
 const elements={productImagePreview:image,productImageSelection:caption,productCurrentImageOpen:zoom,productForm:form};
 const ctx={
  productPreviewGeneration:0,productPhotoFile:null,
  productImagePath:()=> 'private/old.jpg',
  productImageUrl:()=>pending,
  getValue:()=> 'p1',
  $:id=>elements[id], L:{apiError:e=>String(e)}
 };
 vm.runInNewContext(previewCode,ctx);
 const loading=ctx.showCurrentProductEditPhoto('p1');
 ctx.productPreviewGeneration++;
 ctx.productPhotoFile={name:'new.jpg'};
 resolve('https://example.invalid/old-photo');
 await loading;
 assert.equal(image.src,'new-file');
 assert.equal(zoom.hidden,true);
});
test('edit UI has accessible enlarge button and original Windows production remains outside package',()=>{
 assert.ok(html.includes('id="productCurrentImageOpen"'));
 assert.ok(html.includes('id="productImagePreview"'));
 assert.ok(js.includes("openDesktopProductImage(view.dataset.openProductImage)"));
 assert.ok(js.includes("openDesktopProductImage(id)"));
 assert.equal(pkg.version,'0.2.1');
 assert.equal(pkg.build.publish,null);
 assert.equal(pkg.build.appId,'at.trummcards.cloudtest');
});
