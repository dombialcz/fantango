// Package the generated memorial without changing the artwork; match town sprite padding.
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const source=process.argv[2];if(!source)throw Error('Pass the generated PNG path.');
const bytes=await readFile(source);const browser=await chromium.launch();
try{
  const page=await browser.newPage();
  const data=await page.evaluate(async url=>{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const scale=440/Math.max(image.naturalWidth,image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    canvas.getContext('2d').drawImage(image,(512-width)/2,476-height,width,height);
    return canvas.toDataURL('image/webp',.88).split(',')[1];
  },`data:image/png;base64,${bytes.toString('base64')}`);
  await writeFile('assets/town/cemetery.webp',Buffer.from(data,'base64'));
  console.log('Saved assets/town/cemetery.webp (512×512 transparent WebP).');
}finally{await browser.close();}
