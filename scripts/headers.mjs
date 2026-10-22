export const securityHeaders={
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'strict-origin-when-cross-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
};
export const immutable='public, max-age=31536000, immutable';
export const revalidate='public, max-age=0, must-revalidate';
export const headersFor=path=>({...securityHeaders,'Cache-Control':path.startsWith('/static/')?immutable:revalidate});
export const netlifyHeaders=()=>{
 const block=(path,headers)=>path+'\n'+Object.entries(headers).map(([k,v])=>`  ${k}: ${v}`).join('\n')+'\n';
 return block('/*',securityHeaders)+block('/static/*',{'Cache-Control':immutable})+['/','/index.html','/en/*','/pl/*','/ru/*','/404.html','/robots.txt','/sitemap.xml','/site.webmanifest','/favicon.ico','/apple-touch-icon.png'].map(p=>block(p,{'Cache-Control':revalidate})).join('');
};
