import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compileUtterance } from './vendor/engine/sign-speech.js';
import { signLookup } from './vendor/engine/sign-dictionary.js';
import { retargetClipToObject } from './vendor/engine/animation-retarget.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
let renderer, scene, camera, controls, avatar, mixer, action, result;
let playing = false, ready = false, look = 'clay', duration = 0;
let lastUiTime = -1;
const rest = [], materials = [];
const examples = ['Hello', 'Thanks', 'Please', 'Sorry', 'Yes', 'No', 'Help', 'Love'];
const wordLookup = signLookup();
for (const word of examples) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = word;
  button.addEventListener('click', () => { $('#text').value = word; $('#mode').value = 'words'; animateText(); });
  $('#examples').append(button);
}
function setPlaying(value) {
  playing = value; if(action) action.paused = !value;
  $('#play').textContent = value ? 'Ⅱ' : '▶'; $('#play').setAttribute('aria-label', value ? 'Pause animation' : 'Play animation');
}
function seek(time) {
  if (!action) return;
  action.enabled = true; action.time = Math.max(0, Math.min(duration, time)); mixer.update(0); updateUI();
}
function updateUI() {
  if (!action) return;
  const t = action.time;
  if(t === lastUiTime) return;
  lastUiTime = t;
  $('#timeline').value = t; $('#time').textContent = `${t.toFixed(1)} / ${duration.toFixed(1)}s`;
  const i = result.segments.findIndex(s => t >= s.start && t < s.end);
  [...$('#sequence').children].forEach((e, n) => e.classList.toggle('active', i === n));
  const segment = result.segments[i];
  if(segment){
    const letter = segment.letters?.find(m => t >= m.start && t < m.end)?.letter;
    $('#current-word').textContent = letter ? `${segment.word.toLowerCase()} · ${letter}` : segment.word.charAt(0) + segment.word.slice(1).toLowerCase() + '.';
    $('#motion-kind').textContent = segment.signed ? 'WORD STUDY' : 'FINGERSPELLING';
  }
}
function animateText(autoplay = true) {
  if(!ready) return;
  const input = $('#text').value.trim();
  if (!input || !/^[a-zA-Z0-9\s.,!?'’-]+$/.test(input) || !/[a-zA-Z0-9]/.test(input)) {
    $('#status').textContent = 'Enter a word or name using A–Z or 0–9. Punctuation is not animated.'; return;
  }
  try {
    const next = compileUtterance(input, { signs: $('#mode').value === 'words' ? wordLookup : null, maxSeconds: 45 });
    for(const track of next.clip.tracks) {
      const width = track.type === 'quaternion' ? 4 : track.type === 'number' ? 1 : 3;
      if(track.values.length !== track.times.length * width || !track.values.every(Number.isFinite)) {
        throw new Error('The motion contains invalid animation data. Try a single word.');
      }
    }
    mixer.stopAllAction(); if(action) mixer.uncacheClip(action.getClip());
    rest.forEach(([node,q]) => node.quaternion.copy(q)); avatar.updateMatrixWorld(true);
    const mapped = retargetClipToObject(THREE.AnimationClip.parse(next.clip), avatar);
    if(!mapped.clip) throw new Error('The animation could not be matched to this character.');
    result = next; duration = mapped.clip.duration; lastUiTime = -1;
    action = mixer.clipAction(mapped.clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    mixer.timeScale = Number($('#speed').value);
    $('#timeline').max = duration;
    $('#sequence').replaceChildren();
    result.segments.forEach(s => {
      const b = document.createElement('button'); b.className = 'token'; b.append(document.createTextNode(s.word.toLowerCase()));
      const small = document.createElement('small'); small.textContent = s.signed ? 'word' : 'spelled'; b.append(small);
      b.setAttribute('aria-label', `Seek to ${s.word.toLowerCase()}, ${small.textContent}`);
      b.onclick = () => { setPlaying(false); seek(s.start + Math.min(.5,(s.end-s.start)/2)); }; $('#sequence').append(b);
    });
    const parts = [];
    if(result.signed.length) parts.push(`Word playback: ${result.signed.map(w=>w.toLowerCase()).join(', ')}.`);
    if(result.spelled.length) parts.push(`Spelled: ${result.spelled.map(w=>w.toLowerCase()).join(', ')}.`);
    $('#status').textContent = parts.join(' ') + (result.truncated ? ' Stopped at the 45-second limit.' : '');
    $('#current-word').textContent = input.slice(0,25); setPlaying(autoplay); seek(autoplay ? 0 : Math.min(.65,duration/2));
  } catch (error) { setPlaying(false); $('#status').textContent = `Could not animate: ${error.message}`; console.error(error); }
}
function setLook(value) {
  look = value;
  materials.forEach(({mesh,original,clay}) => { mesh.material = value === 'clay' ? clay : original; });
  document.querySelectorAll('[data-look]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.look === value)));
  $('#render-style').textContent = value === 'clay' ? 'Clay study' : 'Original materials';
}
function view(name) {
  if(!camera) return;
  const views = { front: [[0,1.43,2.05],[0,1.35,0]], angle: [[.9,1.46,1.95],[0,1.35,0]], hands: [[0,1.42,1.6],[0,1.4,0.08]] };
  const [p,t] = views[name]; camera.position.fromArray(p); controls.target.fromArray(t); controls.update();
}
$('#form').onsubmit = e => { e.preventDefault(); animateText(); };
$('#play').onclick = () => { if(action?.time >= duration-.01) seek(0); setPlaying(!playing); };
$('#replay').onclick = () => { seek(0); setPlaying(true); };
$('#timeline').oninput = e => { setPlaying(false); seek(Number(e.target.value)); };
$('#speed').onchange = e => { if(mixer) mixer.timeScale = Number(e.target.value); };
$('#mode').onchange = () => animateText();
document.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>setLook(b.dataset.look));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
async function boot() {
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x283a34,1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  stage.prepend(renderer.domElement); renderer.domElement.setAttribute('aria-label','Interactive 3D character');
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(32,1,.05,50);
  controls = new OrbitControls(camera,renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance=1.25; controls.maxDistance=4.5; controls.maxPolarAngle=Math.PI*.65;
  scene.add(new THREE.HemisphereLight(0xf9f5e7,0x4b6154,2.5));
  const key = new THREE.DirectionalLight(0xffeedc,3.4); key.position.set(-3,4,4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4decb,1.3); fill.position.set(3,2,2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf3e9c8,3); rim.position.set(1,3,-3); scene.add(rim);
  // The generated rotations were authored on this skeleton. Using that same
  // rig preserves the intended hand positions and finger shapes instead of
  // introducing the head intersections seen on the previous character.
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./assets/precision-avatar.glb'); avatar=gltf.scene;
  avatar.traverse(node=> {
    rest.push([node,node.quaternion.clone()]);
    if(node.isMesh) {
      const original=node.material;
      const makeClay = m => {
        const c=m.clone(); c.map=null; c.normalMap=null; c.roughnessMap=null; c.metalnessMap=null;
        c.color.set(node.name.includes('Eye') ? '#636a5d' : node.name.includes('Hair') || node.name.includes('Glasses') ? '#67705d' : node.name.includes('Outfit') ? '#929e85' : '#c8c9ae');
        c.roughness=.82;c.metalness=0; return c;
      };
      materials.push({mesh:node,original,clay:Array.isArray(original)?original.map(makeClay):makeClay(original)});
      node.frustumCulled=false;
    }
  });
  scene.add(avatar); mixer=new THREE.AnimationMixer(avatar);
  mixer.addEventListener('finished',()=>setPlaying(false));
  setLook(look); view('front');
  const resize=()=>{const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(stage); resize();
  ready=true; $('#loading').hidden=true; $('#loading').style.display='none';
  ['#play','#replay','#timeline','#generate'].forEach(s=>$(s).disabled=false);
  animateText(false);
  let last=performance.now(), lastFrame=0;
  renderer.setAnimationLoop(now=>{if(now-lastFrame<1000/30)return;lastFrame=now;const dt=Math.min((now-last)/1000,.1);last=now;if(playing)mixer.update(dt);controls.update();updateUI();renderer.render(scene,camera);});
}
boot().catch(error=>{$('#loading').textContent='Preview could not load. Reload to try again.';$('#status').textContent=error.message; console.error(error);});
