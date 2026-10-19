import * as THREE from './vendor/three.module.min.js';
export const PHOTO_FRAME={width:384,height:480,subjectHeight:400,planeWidth:3.84,planeHeight:4.8,minViewWidth:3.1,minViewHeight:4.7,maxWarpX:.075,maxWarpY:.06,flowWidth:96,flowHeight:120};
const F=PHOTO_FRAME;

// Photo-based 2.5D: preserve the supplied character rather than inventing a new model.
// Numeric optical-flow fields reproject neighboring views before blending them.
export async function createCharacter3D(host){
 const base=new URL('./',import.meta.url);
 const [cropResponse,flowResponse]=await Promise.all([fetch(new URL('assets/frame-crops.json',base)),fetch(new URL('assets/photo-flow.bin',base))]);
 if(!cropResponse.ok||!flowResponse.ok)throw Error('Photo scene data is unavailable');
 const crops=await cropResponse.json();
 const flowData=new Uint8Array(await new Response(flowResponse.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 const fieldSize=F.flowWidth*F.flowHeight*2;
 if(crops.length!==20||flowData.length!==fieldSize*40)throw Error('Invalid photo interpolation data');
 const images=await Promise.all(crops.map(async(_,i)=>{const img=new Image();img.src=new URL(`frames/frame_${String(i).padStart(2,'0')}.webp`,base).href;await img.decode();return img;}));
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const textures=images.map((img,i)=>{
  const [left,top,right,bottom]=crops[i].bounds;
  const x=Math.max(0,left-4),y=Math.max(0,top-4),w=Math.min(480,right+4)-x,h=Math.min(592,bottom+4)-y;
  const canvas=document.createElement('canvas');canvas.width=F.width;canvas.height=F.height;
  const ctx=canvas.getContext('2d'),drawWidth=Math.round(w/h*F.subjectHeight);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,x,y,w,h,Math.floor((F.width-drawWidth)/2),(F.height-F.subjectHeight)/2,drawWidth,F.subjectHeight);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  return texture;
 });
 const flows=Array.from({length:40},(_,i)=>{
  const field=flowData.subarray(i*fieldSize,(i+1)*fieldSize);
  const texture=new THREE.DataTexture(field,F.flowWidth,F.flowHeight,THREE.RGFormat,THREE.UnsignedByteType);
  texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.unpackAlignment=1;texture.needsUpdate=true;return texture;
 });
 const uniforms={imageA:{value:textures[0]},imageB:{value:textures[1]},flowAB:{value:flows[0]},flowBA:{value:flows[1]},fraction:{value:0}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms,
  vertexShader:`varying vec2 photoUV;void main(){photoUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
   uniform sampler2D imageA,imageB,flowAB,flowBA;uniform float fraction;varying vec2 photoUV;
   vec2 motion(sampler2D field,vec2 uv){return clamp((texture2D(field,uv).rg*2.0-1.0)*0.25,vec2(-${F.maxWarpX},-${F.maxWarpY}),vec2(${F.maxWarpX},${F.maxWarpY}));}
   void main(){
    float t=fraction;vec2 a=photoUV-t*motion(flowAB,photoUV);vec2 b=photoUV-(1.0-t)*motion(flowBA,photoUV);
    a=photoUV-t*motion(flowAB,a);b=photoUV-(1.0-t)*motion(flowBA,b);
    vec4 ca=texture2D(imageA,a),cb=texture2D(imageB,b);
    // Preserve sharp facial/code details and avoid long double silhouettes at occlusions.
    float difference=length(ca.rgb-cb.rgb)*0.6+abs(ca.a-cb.a);
    float detail=smoothstep(0.12,0.32,difference);
    float blend=mix(t,smoothstep(0.47,0.53,t),detail);
    vec4 mixed=mix(vec4(ca.rgb*ca.a,ca.a),vec4(cb.rgb*cb.a,cb.a),blend);
    gl_FragColor=vec4(mixed.rgb/max(mixed.a,0.0001),mixed.a);
    #include <colorspace_fragment>
   }`
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(F.planeWidth,F.planeHeight),material),scene=new THREE.Scene();scene.add(mesh);
 const camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,20);camera.position.z=8;
 let lastPair=-1,lost=false;
 function render(){if(!lost)renderer.render(scene,camera);}
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const aspect=r.width/r.height;
  const height=Math.max(F.minViewHeight,F.minViewWidth/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;
  camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);render();
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;host.dispatchEvent(new Event('scene-unavailable'));});
 return {
  setView(yaw,pitch){
   const view=(((yaw%360)+360)%360)/360*20,pair=Math.floor(view),fraction=view-pair;
   if(pair!==lastPair){uniforms.imageA.value=textures[pair];uniforms.imageB.value=textures[(pair+1)%20];uniforms.flowAB.value=flows[pair*2];uniforms.flowBA.value=flows[pair*2+1];lastPair=pair;}
   uniforms.fraction.value=fraction;mesh.rotation.x=pitch*Math.PI/180*.5;
   renderer.domElement.dataset.view=view.toFixed(4);render();
  },
  dispose(){observer.disconnect();textures.forEach(t=>t.dispose());flows.forEach(t=>t.dispose());material.dispose();mesh.geometry.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
