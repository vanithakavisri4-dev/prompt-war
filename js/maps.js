/**
 * ArenaFlow AI — Google Maps Integration
 * Canvas-based stadium map with crowd overlays.
 * @module MapsService
 */
'use strict';
const MapsService = (() => {
  let _canvas, _ctx, _activeLayer = 'crowd', _animFrame;
  const OUTER = [
    {x:.5,y:.02},{x:.78,y:.08},{x:.95,y:.25},{x:.98,y:.5},
    {x:.95,y:.75},{x:.78,y:.92},{x:.5,y:.98},{x:.22,y:.92},
    {x:.05,y:.75},{x:.02,y:.5},{x:.05,y:.25},{x:.22,y:.08}
  ];
  const INNER = [
    {x:.5,y:.25},{x:.7,y:.3},{x:.78,y:.42},{x:.78,y:.58},
    {x:.7,y:.7},{x:.5,y:.75},{x:.3,y:.7},{x:.22,y:.58},
    {x:.22,y:.42},{x:.3,y:.3}
  ];
  function init(id) {
    _canvas = document.getElementById(id);
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    resize();
    window.addEventListener('resize', ArenaUtils.debounce(resize, 200));
    (function loop() { draw(); _animFrame = requestAnimationFrame(loop); })();
  }
  function resize() {
    if (!_canvas || !_ctx) return;
    const p = _canvas.parentElement, dpr = devicePixelRatio || 1;
    const pw = p.clientWidth > 20 ? p.clientWidth : 600;
    _canvas.width = pw * dpr;
    _canvas.height = pw * 0.6 * dpr;
    _canvas.style.width = pw + 'px';
    _canvas.style.height = pw * 0.6 + 'px';
    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    _ctx.scale(dpr, dpr);
  }
  function setLayer(l) { _activeLayer = l; }
  function stop() { cancelAnimationFrame(_animFrame); }
  function draw() {
    if (!_ctx) return;
    const w = _canvas.clientWidth, h = _canvas.clientHeight, snap = CrowdEngine.getSnapshot();
    if (w < 10 || h < 10) return; // Skip if canvas is too small (hidden view)
    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = '#0d1117'; _ctx.fillRect(0, 0, w, h);
    // Grid
    _ctx.strokeStyle = 'rgba(108,99,255,0.05)'; _ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) { _ctx.beginPath(); _ctx.moveTo(x,0); _ctx.lineTo(x,h); _ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { _ctx.beginPath(); _ctx.moveTo(0,y); _ctx.lineTo(w,y); _ctx.stroke(); }
    // Outer wall
    _ctx.beginPath();
    OUTER.forEach((p,i) => i===0 ? _ctx.moveTo(p.x*w,p.y*h) : _ctx.lineTo(p.x*w,p.y*h));
    _ctx.closePath(); _ctx.strokeStyle='rgba(108,99,255,0.4)'; _ctx.lineWidth=2; _ctx.stroke();
    _ctx.fillStyle='rgba(108,99,255,0.03)'; _ctx.fill();
    // Inner wall
    _ctx.beginPath();
    INNER.forEach((p,i) => i===0 ? _ctx.moveTo(p.x*w,p.y*h) : _ctx.lineTo(p.x*w,p.y*h));
    _ctx.closePath(); _ctx.strokeStyle='rgba(0,212,255,0.3)'; _ctx.lineWidth=1.5; _ctx.stroke();
    // Field
    const fx=.35*w, fy=.35*h, fw=.3*w, fh=.3*h;
    _ctx.fillStyle='rgba(16,185,129,0.12)'; _ctx.fillRect(fx,fy,fw,fh);
    _ctx.strokeStyle='rgba(16,185,129,0.4)'; _ctx.lineWidth=1.5; _ctx.strokeRect(fx,fy,fw,fh);
    _ctx.beginPath(); _ctx.moveTo(fx+fw/2,fy); _ctx.lineTo(fx+fw/2,fy+fh); _ctx.stroke();
    _ctx.beginPath(); _ctx.arc(fx+fw/2,fy+fh/2,Math.min(fw,fh)*.15,0,Math.PI*2); _ctx.stroke();
    _ctx.fillStyle='rgba(16,185,129,0.5)'; _ctx.font=`${Math.max(10,w*.018)}px Inter,sans-serif`;
    _ctx.textAlign='center'; _ctx.fillText('PLAYING FIELD',fx+fw/2,fy+fh/2+4);
    // Layers
    if (snap?.zones) {
      const layerType = {crowd:null,food:'food',facilities:'restroom',exits:'gate'}[_activeLayer];
      const emoji = {food:'🍔',facilities:'🚻',exits:'🚪'}[_activeLayer];
      const zones = layerType ? snap.zones.filter(z=>z.type===layerType) : snap.zones;
      zones.forEach(z => {
        const x=z.x*w, y=z.y*h;
        if (_activeLayer==='crowd') {
          const r=20+z.density*35, g=_ctx.createRadialGradient(x,y,0,x,y,r);
          if (z.density>.8){g.addColorStop(0,'rgba(239,68,68,0.6)');g.addColorStop(1,'rgba(239,68,68,0)');}
          else if(z.density>.6){g.addColorStop(0,'rgba(245,158,11,0.5)');g.addColorStop(1,'rgba(245,158,11,0)');}
          else{g.addColorStop(0,'rgba(16,185,129,0.4)');g.addColorStop(1,'rgba(16,185,129,0)');}
          _ctx.fillStyle=g; _ctx.beginPath(); _ctx.arc(x,y,r,0,Math.PI*2); _ctx.fill();
        } else {
          _ctx.beginPath(); _ctx.arc(x,y,18,0,Math.PI*2);
          _ctx.fillStyle=z.density>.7?'rgba(239,68,68,0.3)':'rgba(16,185,129,0.3)'; _ctx.fill();
          _ctx.strokeStyle=z.density>.7?'#ef4444':'#10b981'; _ctx.lineWidth=1.5; _ctx.stroke();
          _ctx.font='16px sans-serif'; _ctx.textBaseline='middle'; _ctx.fillText(emoji,x,y);
        }
      });
      // Labels
      _ctx.font=`${Math.max(8,w*.013)}px Inter,sans-serif`; _ctx.textBaseline='top';
      _ctx.fillStyle='rgba(241,245,249,0.5)';
      snap.zones.filter(z=>['seating','concourse'].includes(z.type)).forEach(z=>{
        _ctx.fillText(z.name.replace(' Stand ','').replace('Concourse','Conc.'),z.x*w,z.y*h+20);
      });
    }
    // User marker
    const sec = ArenaUtils.storage.get('section','north-lower');
    const uz = CrowdEngine.ZONES.find(z=>z.id===sec);
    if (uz) {
      const ux=uz.x*w, uy=uz.y*h, pr=8+Math.sin(Date.now()/1000*3)*3;
      _ctx.beginPath(); _ctx.arc(ux,uy,pr+8,0,Math.PI*2);
      _ctx.strokeStyle='rgba(108,99,255,0.3)'; _ctx.lineWidth=2; _ctx.stroke();
      _ctx.beginPath(); _ctx.arc(ux,uy,6,0,Math.PI*2);
      _ctx.fillStyle='#6c63ff'; _ctx.fill(); _ctx.strokeStyle='#fff'; _ctx.lineWidth=2; _ctx.stroke();
      _ctx.fillStyle='#fff'; _ctx.font=`bold ${Math.max(9,w*.014)}px Inter,sans-serif`;
      _ctx.textAlign='center'; _ctx.fillText('📍 YOU',ux,uy-18);
    }
  }
  return { init, setLayer, stop };
})();
