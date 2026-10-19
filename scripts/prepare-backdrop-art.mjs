// Delivery format conversion only: retain the full generated vertical composition.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const jobs=JSON.parse(await readFile(process.argv[2]??'output/descent-art-jobs.json','utf8'));
const browser=await chromium.launch();
await mkdir('assets/battle',{recursive:true});
try {
  const page=await browser.newPage();
  for(const job of jobs){
    const source=await readFile(job.source);
    const result=await page.evaluate(async url=>{
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      canvas.getContext('2d').drawImage(image,0,0);
      return {data:canvas.toDataURL('image/webp',.84).split(',')[1],width:canvas.width,height:canvas.height};
    },`data:image/png;base64,${source.toString('base64')}`);
    const bytes=Buffer.from(result.data,'base64');
    await writeFile(`assets/battle/${job.id}-descent.webp`,bytes);
    console.log(`${job.id}: ${result.width}×${result.height}, ${Math.round(bytes.length/1024)} KB`);
  }
}finally{await browser.close();}
