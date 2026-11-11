/* NEXT ROOM — custom procedural monster models v2.
 * Original stylized 3D characters, no flat sprites, no external textures.
 * Compatible with Three.js r128, existing game entity APIs and physics.
 */
(function(root) {
  'use strict';
  if (!root.THREE) { throw new Error('Three.js must load before monster-models-v2.js'); }
  const T = root.THREE;
  const mat = (c, e=0, mi=0, rough=0.55, metal=0) => new T.MeshStandardMaterial({color:c, emissive:e, emissiveIntensity:mi, roughness:rough, metalness:metal, side:T.DoubleSide});
  const glow = c => new T.MeshBasicMaterial({color:c});
  const black = mat(0x0d0a12,0x140b1a,0.25);
  const tar = mat(0x0a0b11,0x101019,0.2,0.20,0.08);
  const red = glow(0xff375c), bone = mat(0xd9d0be,0x44392c,0.10), ivory=glow(0xffedda);
  const geom = {
    sph:(w=16,h=12)=>new T.SphereGeometry(1,w,h),
    cone:(r,h,n=8)=>new T.ConeGeometry(r,h,n),
    cyl:(a,b,h,n=10)=>new T.CylinderGeometry(a,b,h,n),
    tor:(r,t,n=24)=>new T.TorusGeometry(r,t,8,n)
  };
  const sphereGeometry=geom.sph(24,16);
  const part=(g,geo,material,x=0,y=0,z=0,s=[1,1,1])=>{const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);mesh.scale.set(...s);g.add(mesh);return mesh;};
  const orb=(g,m,x,y,z,sx,sy= sx,sz=sx)=>part(g,sphereGeometry,m,x,y,z,[sx,sy,sz]);
  const cone=(g,m,x,y,z,r,h,n=8)=>part(g,geom.cone(r,h,n),m,x,y,z);
  const tube=(g,points,r,material)=>{
    const crv=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return part(g,new T.TubeGeometry(crv,Math.max(8,points.length*5),r,6,false),material);
  };
  const light=(g,c,power=1,dist=6,x=0,y=0,z=0)=>{const p=new T.PointLight(c,power,dist);p.position.set(x,y,z);g.add(p);return p;};
  function eye(g,x,y,z,r,iris,white=ivory){
    orb(g,black,x,y,z,r*1.24,r*1.3,r*.6);
    orb(g,white,x,y,z+r*.26,r,r*1.03,r*.49);
    orb(g,iris,x,y,z+r*.70,r*.43,r*.58,r*.30);
    orb(g,ivory,x-r*.12,y+r*.16,z+r*.88,r*.13);
  }
  function teeth(g,centerY,z,n,width,height,reverse=false){
    for(let i=0;i<n;i++){
      const x=(i-(n-1)/2)*width;
      const tooth=cone(g,ivory,x,centerY,z, width*.37,height,5);
      tooth.rotation.z=reverse ? Math.PI : 0;
      tooth.rotation.x=Math.PI/15;
    }
  }
  function mouth(g,y,z,w=.52,h=.27){
    orb(g,glow(0x050307),0,y,z,w,h,.085);
    orb(g,mat(0x5a0f2c,0x4d0020,.5),0,y-h*.5,z+.052,w*.8,h*.32,.08);
    teeth(g,y+h*.60,z+.095,7,w*.25,h*.8,true);
    teeth(g,y-h*.48,z+.095,6,w*.25,h*.60,false);
  }
  function spike(g,m,base,tip,rad=.075){
    const a=new T.Vector3(...base),b=new T.Vector3(...tip),delta=b.clone().sub(a);
    const p=cone(g,m,...a.clone().add(b).multiplyScalar(.5).toArray(),rad,delta.length(),6);
    p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return p;
  }
  function shadowStrands(g,count,radius,cy,depth,m){
    const out=[];
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count, xx=Math.cos(a),yy=Math.sin(a);
      const t=tube(g,[[xx*radius,cy+yy*radius,0],[xx*(radius+.24),cy+yy*(radius+.25),-.20],[xx*(radius+.44),cy+yy*(radius+.3),-depth]],.07,m);
      out.push(t);
    }return out;
  }
  function defaultMeta(g,type,body){g.userData.type=type;g.userData.body=body;g.userData.animPhase=0;g.visible=false;return g;}

  function Gale(){
    const g=new T.Group(), body=new T.Group();g.add(body);
    const shell=orb(body,tar,0,0,0,1.20,1.36,.95);
    for(let i=0;i<9;i++){
      const a=(i*2.399),s=.47+(i%3)*.14;
      orb(body,i%2?tar:black,Math.cos(a)*.79,Math.sin(a)*.89,-.31,s,s*1.26,s);
    }
    shadowStrands(body,10,1.05,.04,.60,mat(0x171022,0x62081d,.18));
    eye(body,-.46,.32,.89,.25,red);eye(body,.46,.32,.89,.25,red);
    // Additional buried eyes create an unsettling asymmetric mask.
    orb(body,glow(0xb72c48),-.66,-.11,.75,.080);orb(body,glow(0xb72c48),.78,.03,.67,.080);
    mouth(body,-.40,.86,.68,.43);
    const mandible=orb(body,black,0,-.83,.39,.73,.30,.51);
    const fangs=[];
    for(let k=0;k<7;k++) fangs.push(spike(body,bone,[(k-3)*.20,-.70,.97],[(k-3)*.19,-1.0,1.12],.065));
    const rings=[];
    for(let k=0;k<2;k++){
      const rr=part(g,geom.tor(k?1.85:1.5,k?.038:.060,38),new T.MeshBasicMaterial({color:k?0x5b1c3b:0xce2344,transparent:true,opacity:k?.36:.63}),0,0,0);
      rr.rotation.y=k?1.0:.2;rings.push(rr);
    }
    g.userData={ring1:rings[0],ring2:rings[1],body,mandible,type:'gale',animPhase:0};
    light(g,0xb8193c,1.2,8,0,.15,.3);g.visible=false;return g;
  }
  function Whisper(){
    const g=new T.Group(),body=new T.Group();g.add(body);
    orb(body,tar,0,0,0,.46,.49,.40);
    for(let i=0;i<7;i++){const a=i*6.283/7;
      const t=spike(body,black,[Math.cos(a)*.28,Math.sin(a)*.31,-.18],[Math.cos(a)*.65,Math.sin(a)*.65,-.30],.12);
    }
    eye(body,-.17,.10,.35,.11,red);eye(body,.17,.10,.35,.11,red);
    mouth(body,-.17,.34,.24,.13);
    const tentacles=[];
    for(let i=0;i<7;i++){
      const a=i*2*Math.PI/7,dx=Math.cos(a),dy=Math.sin(a);
      const pivot=new T.Group();pivot.position.set(dx*.23,dy*.2,-.14);body.add(pivot);
      tube(pivot,[[0,0,0],[dx*.19,dy*.19,-.10],[dx*.31,dy*.43,-.27],[dx*.52,dy*.50,-.44]],.045,tar);
      tentacles.push(pivot);
    }
    g.userData={body,tentacles,type:'whisper',animPhase:0};light(g,0x6049d8,.36,3);g.visible=false;return g;
  }
  function Decoy(){
    const g=new T.Group(),body=new T.Group();g.add(body);
    const skull=orb(body,black,0,.17,-.10,.67,.78,.46);
    // Crack-like magenta capillaries.
    const cracks=mat(0x67214c,0x8b2861,.35);
    for(let s of [-1,1]){
      tube(body,[[s*.18,.78,.1],[s*.41,.53,.22],[s*.37,.30,.30]],.025,cracks);
      eye(body,s*.31,.26,.28,.135,glow(0xffdb70));
      for(let i=0;i<4;i++) spike(body,tar,[s*.48,.05-i*.12,.08],[s*(.8+i*.10),-.20-i*.14,.60+i*.05],.085);
    }
    mouth(body,-.25,.37,.40,.39);
    for(let i=0;i<6;i++){const x=(i-2.5)*.15;spike(body,ivory,[x,-.06,.52],[x*.8,-.43,.60],.055);}
    const blades=[];
    for(const s of [-1,1]){
      const b=new T.Group();b.position.set(s*.55,-.20,-.10);body.add(b);
      tube(b,[[0,0,0],[s*.27,-.13,.19],[s*.54,-.34,.80]],.08,black);
      for(let j=0;j<3;j++)spike(b,bone,[s*.44+j*.07,-.29,.68],[s*(.55+j*.10),-.45,.95],.055);
      blades.push(b);
    }
    g.userData={body,blades,type:'decoy',animPhase:0};g.visible=false;return g;
  }
  function Echo(){
    const g=new T.Group(),body=new T.Group();g.add(body);
    const teal=mat(0x092f2a,0x15877b,.60,.32),pale=mat(0xbed4be,0x55bfb4,.24),mint=glow(0xa7ffe6);
    orb(body,teal,0,0,-.2,.98,1.27,.57);
    // Translucent ghost shrouds (thin conical ribbons, not a cylinder).
    for(let i=0;i<7;i++){
      const a=(i/7)*6.283;
      const sx=Math.sin(a)*.8,sy=Math.cos(a)*.7;
      spike(body,teal,[sx,sy,-.28],[sx*1.30,sy*1.8,-1.15],.19);
    }
    orb(body,pale,0,.08,.30,.72,.88,.25);
    for(let s of [-1,1]){
      eye(body,s*.30,.25,.54,.19,mint);
      spike(body,teal,[s*.54,.73,.14],[s*.88,1.3,-.35],.14);
    }
    mouth(body,-.40,.58,.37,.36);
    const ring=part(g,geom.tor(1.35,.055,32),new T.MeshBasicMaterial({color:0x67ffe4,transparent:true,opacity:.28}));ring.rotation.y=.2;
    g.userData={body,outerCage:ring,type:'echo',animPhase:0};light(g,0x1ccfb2,1.0,8);g.visible=false;return g;
  }
  function Ink(){
    const g=new T.Group(), body=new T.Group();g.add(body);
    const m=mat(0x0b0c12,0x0f0a1c,.30,.16,.50);
    // Spreading ink pool on the floor (stays flat while the body bobs).
    part(g,geom.cyl(1.25,1.5,.05,20),m,0,.03,-.35);
    // A leaning wave of ink: tall crest in front, low trailing mounds behind.
    orb(body,m,0,.85,.15,.78,.85,.62);
    orb(body,m,0,.55,-.55,.92,.55,.75);
    orb(body,m,0,.32,-1.20,.75,.32,.70);
    orb(body,m,0,1.45,.38,.46,.50,.40);
    for(let i=0;i<7;i++){
      const x=(i-3)*.24, y=1.25-Math.abs(i-3)*.2;
      spike(body,m,[x,y,.55],[x*1.15,y-.55,.72],.085);
    }
    // Many small pale eyes of different sizes scattered over the crest.
    for(const [x,y,z,r] of [[-.28,1.50,.70,.085],[.20,1.62,.68,.06],[.02,1.30,.80,.11],[-.42,1.05,.70,.06],[.40,1.10,.68,.075],[.10,.85,.78,.05]]){
      orb(body,glow(0xe9f1ff),x,y,z,r,r,r*.4);
      orb(body,glow(0x10131c),x,y,z+r*.3,r*.45,r*.45,r*.2);
    }
    // Skittering legs: two per pivot, bound to the limb nodes the chase AI already swings.
    const limbs={};
    for(const [key,s,z] of [['leftArm',-1,.35],['rightArm',1,.35],['leftLeg',-1,-.45],['rightLeg',1,-.45]]){
      const pivot=new T.Group();pivot.position.set(s*.6,.75,z);body.add(pivot);
      tube(pivot,[[0,0,0],[s*.55,.25,.10],[s*.95,-.75,.20]],.07,m);
      tube(pivot,[[0,-.1,-.3],[s*.50,.10,-.35],[s*.85,-.75,-.45]],.06,m);
      limbs[key]=pivot;
    }
    g.userData={body,...limbs,type:'ink',animPhase:0};light(g,0x4a5cff,.65,6,0,1.2,.3);g.visible=false;return g;
  }
  function Warden(){
    const g=new T.Group(), body=new T.Group();g.add(body);
    const robe=mat(0x2a2233,0x0d0814,.20,.85),trim=mat(0x7a6240,0x2a1c08,.15,.60,.30),paper=mat(0xd8cfb8,0x3a3324,.10,.80);
    part(body,geom.cone(.78,2.1,12),robe,0,1.05,0);
    orb(body,robe,0,2.05,0,.50,.42,.36);
    const belt=part(body,geom.tor(.47,.03,20),trim,0,1.45,0);belt.rotation.x=Math.PI/2;
    const headGroup=new T.Group();headGroup.position.set(0,2.62,0);body.add(headGroup);
    orb(headGroup,robe,0,.02,-.06,.40,.47,.42);
    orb(headGroup,glow(0x07050a),0,-.02,.24,.26,.32,.14);
    // Two round spectacle lenses catch the lantern light inside the dark hood.
    for(const s of [-1,1]){
      part(headGroup,geom.tor(.085,.014,16),trim,s*.11,.02,.37);
      orb(headGroup,glow(0xffd98a),s*.11,.02,.36,.07,.07,.012);
    }
    const limbs={};
    for(const [key,s] of [['leftArm',-1],['rightArm',1]]){
      const pivot=new T.Group();pivot.position.set(s*.5,2.1,0);body.add(pivot);
      orb(pivot,robe,0,-.42,.05,.15,.50,.17);
      orb(pivot,paper,0,-.92,.10,.09,.10,.09);
      limbs[key]=pivot;
    }
    // The robe hides the legs; empty pivots keep the walk-cycle contract.
    for(const [key,s] of [['leftLeg',-1],['rightLeg',1]]){
      const pivot=new T.Group();pivot.position.set(s*.2,.3,0);body.add(pivot);limbs[key]=pivot;
    }
    // Lantern staff is fixed to the body so the light does not swing with the arms.
    const staff=new T.Group();staff.position.set(.62,0,.35);body.add(staff);
    part(staff,geom.cyl(.03,.035,2.9,8),trim,0,1.45,0);
    tube(staff,[[0,2.9,0],[-.05,3.1,.2],[-.1,2.95,.42]],.025,trim);
    const lantern=new T.Group();lantern.position.set(-.1,2.9,.42);staff.add(lantern);
    part(lantern,geom.cyl(.13,.16,.34,8),glow(0xffcf7a),0,-.28,0);
    part(lantern,geom.cone(.2,.14,8),trim,0,-.04,0);
    part(lantern,geom.cyl(.17,.17,.04,8),trim,0,-.47,0);
    // A stack of books tucked under the left arm.
    for(let i=0;i<3;i++){
      const bk=part(body,new T.BoxGeometry(.42,.09,.30),i%2?paper:trim,-.50,1.50+i*.10,.30);bk.rotation.y=.2*i;
    }
    g.userData={body,headGroup,...limbs,lantern,type:'warden',animPhase:0};light(g,0xffb95e,.8,9,.5,2.6,.8);return g;
  }
  function Spook(){
    const g=new T.Group(),body=new T.Group();g.add(body);
    const cloak=mat(0x130d1b,0x390f29,.28,.78),mask=mat(0xc8c2b9,0x191116,.14,.68);
    const dress=part(body,geom.cone(.79,1.70,12),cloak,0,.86,0);
    orb(body,cloak,0,1.63,0,.75,.41,.46);
    const head=new T.Group();head.position.set(0,2.22,.10);body.add(head);
    orb(head,cloak,0,0,-.08,.58,.69,.48);
    orb(head,mask,0,0,.31,.41,.56,.20);
    // Black recessed eye sockets + expressive bone brow/nose.
    for(const s of [-1,1]){
      orb(head,black,s*.18,.15,.47,.130,.19,.055);
      orb(head,glow(0xc43461),s*.18,.13,.515,.045,.07,.025);
      tube(head,[[s*.08,.39,.48],[s*.20,.39,.46],[s*.33,.28,.42]],.040,mask);
    }
    orb(head,black,0,-.25,.47,.255,.19,.055);
    teeth(head,-.17,.55,7,.065,.135,true);
    const tendrils=[];
    for(let i=0;i<8;i++){
      const a=6.283*i/8,s=Math.cos(a),v=Math.sin(a);
      const pivot=new T.Group();pivot.position.set(s*.43,2.10+v*.26,-.04);body.add(pivot);
      tube(pivot,[[0,0,0],[s*.16,v*.22,-.16],[s*.44,v*.34,-.43]],.055,cloak);tendrils.push(pivot);
    }
    const claws=[];
    for(let s of [-1,1]){
      const pivot=new T.Group();pivot.position.set(s*.55,1.62,.05);body.add(pivot);
      tube(pivot,[[0,0,0],[s*.16,-.20,.15],[s*.30,-.32,.44]],.115,cloak);
      for(let j=0;j<3;j++)spike(pivot,bone,[s*.25+(j-1)*.06,-.33,.38],[s*.31+(j-1)*.09,-.45,.62],.04);
      claws.push(pivot);
    }
    const spookLight=light(g,0xba2858,1.1,6,0,2.16,.7);
    g.userData={body,head,tendrils,claws,spookLight,type:'spook',animPhase:0};g.visible=false;return g;
  }
  // v3: dimensional detailing for a premium stylized horror silhouette.
  // All additional parts are true meshes attached to the EXISTING animated root.
  // They do not change the collision representation or the AI state contract.
  const detailMaterials={
    plum:mat(0x331329,0x230917,.22,.82),ash:mat(0x352f38,0x25121a,.12,.90),
    vein:mat(0x842640,0x420d23,.39,.60),copper:mat(0x6d4a3d,0x160c0a,.09,.59,.18),
    cartilage:mat(0x986b70,0x451c30,.14,.64),tooth:mat(0xeee0c6,0x594f42,.09,.56),
    pearl:mat(0xb1aeb6,0x6f4e6e,.12,.35),moss:mat(0x194e42,0x166e56,.30,.60),
    skin:mat(0x5e273c,0x341024,.22,.74),gloss:mat(0x15171d,0x161323,.21,.27,.18)
  };
  function detailMonster(g,type){
    const u=g.userData,b=u.body||g;
    const d=detailMaterials;
    if(type==='gale'){
      // Skull-like asymmetrical rigid cheekbones and layered shadow plates.
      for(const sign of [-1,1]){
        orb(b,d.ash,sign*.73,.10,.64,.31,.21,.22).rotation.z=sign*.45;
        orb(b,d.plum,sign*.90,-.36,.25,.34,.50,.31).rotation.z=sign*.35;
        tube(b,[[sign*.24,.67,.88],[sign*.49,.70,.94],[sign*.77,.54,.68]],.044,d.vein);
        for(let k=0;k<3;k++)spike(b,d.tooth,[sign*(.41+.16*k),-.65,.81],[sign*(.45+.16*k),-.94,.97],.055);
      }
      for(let i=0;i<7;i++){
        const a=i*2*Math.PI/7;
        const q=orb(b,i%2?d.plum:d.ash,Math.cos(a)*.88,Math.sin(a)*1.02,-.49,.25,.39,.15);
        q.rotation.z=-a*.4;
      }
      // Subtle fractured crest, not a glowing flat decal.
      for(let i=0;i<5;i++)spike(b,d.ash,[(i-2)*.25,1.04,-.30],[(i-2)*.33,1.38+(i%2)*.15,-.44],.105);
    }else if(type==='whisper'){
      // Barbed antennae and tapering tendril tips emphasize its small scale.
      for(let i=0;i<7;i++){
        const a=2*Math.PI*i/7,x=Math.cos(a),y=Math.sin(a);
        spike(b,d.plum,[x*.47,y*.48,-.28],[x*.83,y*.85,-.52],.053);
        orb(b,d.vein,x*.43,y*.46,-.32,.07,.085,.045);
      }
      for(let sign of [-1,1]){
        tube(b,[[sign*.09,.30,.37],[sign*.20,.31,.38],[sign*.30,.21,.33]],.031,d.cartilage);
        orb(b,d.ash,sign*.31,-.17,.20,.14,.22,.14);
      }
    }else if(type==='decoy'){
      // Dimensional temple growths and multiple rows of real teeth.
      for(let sign of [-1,1]){
        orb(b,d.cartilage,sign*.53,.12,.22,.22,.42,.24).rotation.z=sign*.23;
        for(let i=0;i<5;i++)spike(b,d.tooth,[sign*(.29+i*.08),-.25,.42],[sign*(.29+i*.09),-.45,.58],.029);
        tube(b,[[sign*.38,.60,.12],[sign*.54,.44,.40],[sign*.64,.22,.36]],.04,d.vein);
        orb(b,d.ash,sign*.60,-.45,-.08,.30,.32,.25);
      }
      for(let i=0;i<5;i++)spike(b,d.cartilage,[(i-2)*.19,.72,-.20],[(i-2)*.25,1.04,-.46],.09);
    }else if(type==='echo'){
      // Broken jade mask / drifting frayed cloth: different silhouette from Gale.
      const mint=mat(0x66a795,0x3c9084,.36,.61);
      for(const sign of [-1,1]){
        orb(b,mint,sign*.49,.48,.43,.20,.39,.13).rotation.z=sign*.26;
        tube(b,[[sign*.24,.74,.49],[sign*.43,.50,.62],[sign*.51,.17,.49]],.035,d.moss);
        for(let k=0;k<3;k++)spike(b,d.tooth,[sign*(.19+k*.11),-.54,.60],[sign*(.18+k*.10),-.78,.68],.039);
      }
      for(let i=0;i<8;i++){
        const a=i*2*Math.PI/8,sign=Math.cos(a);
        const q=spike(b,d.moss,[sign*.70,-.26,Math.sin(a)*.24],[(1.05+(.12*(i%3)))*sign,-1.18-(i%3)*.15,-.5],.14);
        q.rotation.z=.07*(i%3);
      }
    }else if(type==='ink'){
      // Glossy ripples and drips so the ink reads as liquid, not a solid body.
      for(let sign of [-1,1]){
        orb(b,d.gloss,sign*.55,.55,.05,.34,.30,.40).rotation.z=sign*.25;
        orb(b,d.gloss,sign*.40,.28,-.95,.38,.20,.36);
        for(let i=0;i<3;i++)spike(b,d.gloss,[sign*(.30+i*.18),.95-i*.12,.45],[sign*(.36+i*.2),.30-i*.05,.62],.05);
      }
      for(let i=0;i<5;i++)spike(b,d.gloss,[(i-2)*.22,.30,-1.55],[(i-2)*.3,.02,-2.0],.08);
    }else if(type==='warden'){
      // Pointed hood, frayed hem folds and a key ring on the belt.
      spike(u.headGroup,d.plum,[0,.38,-.10],[0,.78,-.42],.17);
      for(let i=0;i<8;i++){
        const a=i*2*Math.PI/8;
        spike(b,d.plum,[Math.cos(a)*.55,.55,Math.sin(a)*.55],[Math.cos(a)*.86,.02,Math.sin(a)*.86],.13);
      }
      for(let i=0;i<3;i++)orb(b,d.copper,.30+i*.07,1.30-i*.06,.36,.035,.06,.02);
    }else if(type==='spook'){
      // Multi-layer hood folds, bone mask cracks and skeletal cheek/jaw parts.
      for(let sign of [-1,1]){
        orb(b,d.plum,sign*.66,2.04,-.03,.28,.49,.31).rotation.z=sign*.32;
        orb(u.head,d.ash,sign*.40,-.14,.35,.17,.35,.08);
        tube(u.head,[[sign*.23,.42,.48],[sign*.10,.14,.54],[sign*.28,-.16,.54],[sign*.13,-.41,.49]],.024,d.copper);
        for(let i=0;i<4;i++)spike(u.head,d.tooth,[sign*(.10+i*.06),-.27,.51],[sign*(.10+i*.06),-.39,.57],.023);
      }
      for(let i=0;i<6;i++){
        let a=i*2*Math.PI/6;
        spike(b,d.plum,[Math.cos(a)*.55,1.05+Math.sin(a)*.25,-.10],[Math.cos(a)*1.0,.55+Math.sin(a)*.66,-.43],.12);
      }
    }
    g.userData.detailVersion=3;
    return g;
  }

  const builders={gale:Gale,whisper:Whisper,decoy:Decoy,echo:Echo,ink:Ink,warden:Warden,spook:Spook};
  // Keep animation independent of existing AI/collisions: purely visual bobbing and expressions.
  function animate(g,type,dt,time,state={}){
    if(!g || !g.visible)return;
    const u=g.userData;const phase=(u.animPhase||0)+dt;u.animPhase=phase;
    if(u.body){
      if(type==='ink'||type==='warden')u.body.position.y=Math.sin(phase*(type==='ink'?10:4))*(type==='ink'?.045:.025);
      else if(type==='gale'||type==='echo')u.body.position.y=Math.sin(phase*9)*.095;
      else u.body.position.y=Math.sin(phase*4.7)*.035;
    }
    if(u.mandible)u.mandible.position.y=-.83+Math.sin(phase*13)*.045;
    if(type==='decoy'&&u.blades)u.blades.forEach((p,i)=>p.rotation.y=Math.sin(phase*7+i*1.4)*.17);
    if(type==='spook'&&u.claws)u.claws.forEach((p,i)=>p.rotation.x=Math.sin(phase*7+i*Math.PI)*.23);
    if(u.lantern)u.lantern.rotation.z=Math.sin(phase*2.2)*.12;
    if(type==='gale'&&u.ring1){u.ring1.rotation.z+=dt*1.7;u.ring2.rotation.y+=dt*1.9;}
    if(type==='echo'&&u.outerCage)u.outerCage.rotation.z+=dt*.9;
  }
  root.NextRoomMonsters={create:(name)=>{if(!builders[name])throw new Error('Unknown monster: '+name);return detailMonster(builders[name](),name);},animate,names:Object.keys(builders)};
})(window);
