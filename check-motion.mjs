import assert from 'node:assert/strict';
import {compileUtterance} from './screens/vendor/engine/sign-speech.js';
import {signLookup} from './screens/vendor/engine/sign-dictionary.js';
const signs = signLookup();
for (const text of ['Hello', 'Thanks', 'Please', 'Sorry', 'Yes', 'No', 'Help', 'Love', 'Hello Zoe', 'Zoe Hello', 'Hello Please Thanks', 'JAZZ']) {
  const {clip} = compileUtterance(text, {signs});
  for(const track of clip.tracks) {
    const width = track.type === 'quaternion' ? 4 : track.type === 'number' ? 1 : 3;
    assert.equal(track.values.length, track.times.length * width, `${text}: ${track.name} keyframe width`);
    assert(track.values.every(Number.isFinite));
    assert(track.times.every((v,i,a)=>i===0 || v>=a[i-1]));
  }
}
const mixed=compileUtterance('Hello Zoe',{signs});
assert.deepEqual(mixed.signed,['HELLO']); assert.deepEqual(mixed.spelled,['ZOE']);
assert.equal(compileUtterance('JAZZ',{signs:null}).segments[0].letters.length,4);
assert.throws(()=>compileUtterance('   '));
console.log('PASS: 12 motion sequences; scalar facial keyframes; word/spelling distinction; moving and repeated letters; empty input.');
