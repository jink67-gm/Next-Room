/* Lightweight contract test runnable with plain Node.js (no external packages).
 * Validates that procedural constructors and AI connection nodes are available.
 * Full WebGL visual QA should be performed in a browser/monster_gallery.html.
 */
const fs=require('fs'),vm=require('vm'),path=require('path');
class Vec{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}clone(){return new Vec(this.x,this.y,this.z)}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}multiplyScalar(t){this.x*=t;this.y*=t;this.z*=t;return this}length(){return Math.hypot(this.x,this.y,this.z)}normalize(){return this.multiplyScalar(1/(this.length()||1))}toArray(){return [this.x,this.y,this.z]}setScalar(t){return this.set(t,t,t)}}
class Obj{constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.quaternion={setFromUnitVectors(){}};this.userData={};this.visible=true}add(...cs){this.children.push(...cs)}lookAt(){}}
class Group extends Obj{}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Light extends Obj{constructor(color,intensity,distance){super();Object.assign(this,{color,intensity,distance})}}
class Geometry{constructor(...args){this.args=args}}
class Curve{constructor(points){this.points=points}}
class Material{constructor(opts){Object.assign(this,opts)}}
const T={Group,Mesh,PointLight:Light,Vector3:Vec,CatmullRomCurve3:Curve,MeshBasicMaterial:Material,MeshStandardMaterial:Material,DoubleSide:2};
for(let x of 'SphereGeometry ConeGeometry CylinderGeometry TorusGeometry TubeGeometry BoxGeometry'.split(' '))T[x]=Geometry;
const context={window:{THREE:T},Math,console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/monster-models-v2.js'),'utf8'),context);
const maker=context.window.NextRoomMonsters;
const required={gale:['ring1','ring2'],whisper:['tentacles'],decoy:['blades'],echo:['outerCage'],ink:['leftArm','rightArm','leftLeg','rightLeg'],warden:['headGroup','leftArm','rightArm','leftLeg','rightLeg'],spook:['tendrils','spookLight']};
for(const [name,fields] of Object.entries(required)){
 const m=maker.create(name);for(const f of fields)if(!m.userData[f])throw new Error(name+' missing '+f);
 if(name==='warden'&&m.visible===false)throw new Error('Warden should be shown with room');
 if(name!=='warden'&&m.visible!==false)throw new Error(name+' should start hidden');
 m.visible=true;
 const count=(o)=>1+o.children.reduce((acc,c)=>acc+count(c),0);
 const before=count(m);
 maker.animate(m,name,.016,.5);maker.animate(m,name,.016,.516);
 if(!Number.isFinite(m.userData.animPhase))throw new Error(name+' invalid animation');
 console.log(name.padEnd(8), 'contract OK;', before,'scene nodes');
}
console.log('7 monster model contract tests passed');
