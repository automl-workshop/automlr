(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STEEL = [127, 161, 193];
  const BRIGHT = [198, 220, 240];
  const AUTHOR = [217, 164, 112];
  const INK = [236, 234, 227];
  const SURFACE = [19, 19, 22];
  const DURATION = 18;

  const timeParam = new URLSearchParams(location.search).get("t");
  const frozenTime = timeParam !== null && Number.isFinite(Number(timeParam))
    ? Math.max(0, Math.min(DURATION - .01, Number(timeParam)))
    : null;

  const rgba = (rgb, alpha = 1) => `rgba(${rgb.join(",")},${alpha})`;
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const ease = (n) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  const progress = (time, start, end) => ease((time - start) / (end - start));
  const mix = (a, b, t) => a + (b - a) * ease(t);

  function drawPaper(ctx, cx, cy, pw, ph, alpha, accepted) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.shadowColor = rgba(STEEL, .12 + accepted * .14);
    ctx.shadowBlur = 28 + accepted * 18;
    ctx.fillStyle = rgba(SURFACE, .96);
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(accepted > .8 ? BRIGHT : STEEL, .38 + accepted * .42);
    ctx.lineWidth = 1;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);

    const left=-pw*.34;
    const detailScale=Math.max(.45,pw/156);
    const textLines=[
      {y:-.38,width:.68,weight:1.5,bright:true},
      {y:-.33,width:.46,weight:1.5,bright:true},
      {y:-.25,width:.72,weight:1},
      {y:-.20,width:.62,weight:1},
      {y:-.15,width:.75,weight:1},
      {y:-.10,width:.54,weight:1},
      {y: .27,width:.43,weight:.8},
      {y: .33,width:.73,weight:1},
      {y: .38,width:.58,weight:1}
    ];
    textLines.forEach((line)=>{
      ctx.strokeStyle=rgba(line.bright?BRIGHT:STEEL,line.bright?.74:.62);
      ctx.lineWidth=Math.max(.55,line.weight*detailScale);
      ctx.beginPath(); ctx.moveTo(left,ph*line.y); ctx.lineTo(left+pw*line.width,ph*line.y); ctx.stroke();
    });

    for(let i=0;i<3;i++) {
      ctx.fillStyle=rgba(STEEL,.59);
      ctx.beginPath(); ctx.arc(left+i*8*detailScale,-ph*.285,Math.max(.65,1.2*detailScale),0,Math.PI*2); ctx.fill();
    }

    const fx=-pw*.29,fy=-ph*.035,fw=pw*.58,fh=ph*.255;
    ctx.strokeStyle=rgba(STEEL,.55); ctx.lineWidth=Math.max(.5,detailScale);
    ctx.strokeRect(fx,fy,fw,fh);
    ctx.strokeStyle=rgba(BRIGHT,.85);
    ctx.beginPath();
    ctx.moveTo(fx+5*detailScale,fy+fh-7*detailScale);
    ctx.bezierCurveTo(fx+fw*.25,fy+fh-9*detailScale,fx+fw*.34,fy+6*detailScale,fx+fw*.53,fy+fh*.52);
    ctx.bezierCurveTo(fx+fw*.72,fy+fh*.78,fx+fw*.78,fy+5*detailScale,fx+fw-5*detailScale,fy+7*detailScale);
    ctx.stroke();

    ctx.strokeStyle=rgba(BRIGHT,.93); ctx.lineWidth=Math.max(.65,1.5*detailScale);
    ctx.beginPath(); ctx.moveTo(left,ph*.445); ctx.lineTo(left+pw*.68,ph*.445); ctx.stroke();
    ctx.restore();
  }

  function drawAperture(ctx, x, y, scale, alpha, chosen = false, color = STEEL) {
    const accent = chosen ? BRIGHT : color;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.strokeStyle = rgba(accent, chosen ? .92 : .66); ctx.lineWidth = chosen ? 1.3 : 1;
    ctx.beginPath(); ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rgba(accent, chosen ? .9 : .62);
    [-4, 0, 4].forEach((dx) => {ctx.beginPath(); ctx.arc(dx * scale, 0, 1.15 * scale, 0, Math.PI * 2); ctx.fill();});
    ctx.restore();
  }

  function drawNarrowBeam(ctx, aperture, target, paper, alpha, scan, scale) {
    const half = 13 * scale;
    const dx = target.x - aperture.x, dy = target.y - aperture.y;
    const length = Math.hypot(dx, dy) || 1, px = -dy / length, py = dx / length;
    ctx.save(); ctx.globalAlpha = alpha;
    const gradient = ctx.createLinearGradient(aperture.x, aperture.y, target.x, target.y);
    gradient.addColorStop(0, rgba(STEEL, .13)); gradient.addColorStop(1, rgba(STEEL, .025));
    ctx.fillStyle = gradient; ctx.beginPath();
    ctx.moveTo(aperture.x + px * 3 * scale, aperture.y + py * 3 * scale);
    ctx.lineTo(aperture.x - px * 3 * scale, aperture.y - py * 3 * scale);
    ctx.lineTo(target.x - px * half, target.y - py * half);
    ctx.lineTo(target.x + px * half, target.y + py * half); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(BRIGHT, .48); ctx.lineWidth = 1;
    const sy = paper.y - paper.h / 2 + 12 + scan * (paper.h - 24);
    ctx.beginPath(); ctx.moveTo(paper.x-paper.w*.34, sy); ctx.lineTo(paper.x+paper.w*.34, sy); ctx.stroke();
    ctx.restore();
  }

  function drawWideLight(ctx, aperture, paper, width, alpha, scale) {
    ctx.save(); ctx.globalAlpha = alpha;
    const farX = paper.x - width, halfHeight = Math.max(paper.h * .7, width * .42);
    const gradient = ctx.createLinearGradient(aperture.x, aperture.y, farX, paper.y);
    gradient.addColorStop(0, rgba(BRIGHT, .17)); gradient.addColorStop(.58, rgba(BRIGHT, .07)); gradient.addColorStop(1, rgba(BRIGHT, 0));
    ctx.fillStyle = gradient; ctx.beginPath();
    ctx.moveTo(aperture.x, aperture.y - 5 * scale); ctx.lineTo(aperture.x, aperture.y + 5 * scale);
    ctx.lineTo(farX, paper.y + halfHeight); ctx.lineTo(farX, paper.y - halfHeight); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawHypothesis(ctx, x, y, scale, alpha, time) {
    ctx.save(); ctx.translate(x,y); ctx.globalAlpha=alpha; ctx.strokeStyle=rgba(STEEL,.72); ctx.fillStyle=rgba(STEEL,.72); ctx.lineWidth=1;
    const sway=Math.sin(time*1.7)*3*scale;
    const tips=[{x:-34*scale,y:-25*scale+sway},{x:2*scale,y:-39*scale-sway*.5},{x:37*scale,y:-20*scale+sway*.3},{x:-24*scale,y:29*scale-sway*.4},{x:31*scale,y:27*scale+sway*.5}];
    tips.forEach((tip,i)=>{ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(tip.x*.5,tip.y*.2,tip.x,tip.y);ctx.stroke();ctx.beginPath();ctx.arc(tip.x,tip.y,i===2?4*scale:2.5*scale,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle=rgba(BRIGHT,.95);ctx.beginPath();ctx.arc(0,0,4.5*scale,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=rgba(BRIGHT,.28+.18*(.5+.5*Math.sin(time*2.3)));ctx.beginPath();ctx.arc(tips[2].x,tips[2].y,9*scale,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  function drawExperiment(ctx, x, y, scale, alpha, time) {
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;const size=7*scale;
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){const active=(row*5+col+Math.floor(time*3))%7===0;ctx.fillStyle=rgba(active?BRIGHT:STEEL,active?.92:.24+((row+col)%3)*.12);ctx.fillRect((col-2)*size*1.65-size/2,(row-1.5)*size*1.65-size/2,size,size);}
    ctx.strokeStyle=rgba(STEEL,.38);ctx.strokeRect(-49*scale,-36*scale,98*scale,72*scale);const scan=((time*.34)%1)*68*scale-34*scale;ctx.strokeStyle=rgba(BRIGHT,.58);ctx.beginPath();ctx.moveTo(-46*scale,scan);ctx.lineTo(46*scale,scan);ctx.stroke();ctx.restore();
  }

  function drawPlot(ctx, x, y, scale, alpha, time) {
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.strokeStyle=rgba(STEEL,.48);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-48*scale,34*scale);ctx.lineTo(-48*scale,-34*scale);ctx.moveTo(-48*scale,34*scale);ctx.lineTo(50*scale,34*scale);ctx.stroke();
    const lift=Math.sin(time*1.1)*5*scale;ctx.strokeStyle=rgba(BRIGHT,.84);ctx.beginPath();ctx.moveTo(-42*scale,27*scale);ctx.bezierCurveTo(-22*scale,25*scale,-19*scale,-7*scale+lift,0,3*scale);ctx.bezierCurveTo(18*scale,13*scale,25*scale,-25*scale-lift*.3,45*scale,-27*scale);ctx.stroke();
    [-30,-8,18,39].forEach((xx,i)=>{const yy=[20,5,-4,-24][i]*scale+(i%2?lift*.3:0);ctx.fillStyle=rgba(BRIGHT,.9);ctx.beginPath();ctx.arc(xx*scale,yy,2.4*scale,0,Math.PI*2);ctx.fill();});ctx.restore();
  }

  function drawIteration(ctx, x, y, scale, alpha, time) {
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;const radius=34*scale,rotation=time*.72,nodes=[-Math.PI/2,Math.PI/6,Math.PI*5/6];
    ctx.strokeStyle=rgba(STEEL,.42);ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,radius,-.38,Math.PI*1.75);ctx.stroke();const angle=-.38,ax=Math.cos(angle)*radius,ay=Math.sin(angle)*radius;ctx.fillStyle=rgba(STEEL,.62);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-8*scale,ay-1*scale);ctx.lineTo(ax-4*scale,ay+7*scale);ctx.closePath();ctx.fill();
    nodes.forEach((a,i)=>{const nx=Math.cos(a)*radius,ny=Math.sin(a)*radius,active=Math.floor(time*1.25)%nodes.length===i;ctx.strokeStyle=rgba(active?BRIGHT:STEEL,active?.95:.5);ctx.fillStyle=rgba(active?BRIGHT:STEEL,active?.22:.08);if(i===0){ctx.fillRect(nx-5*scale,ny-5*scale,10*scale,10*scale);ctx.strokeRect(nx-5*scale,ny-5*scale,10*scale,10*scale);}else if(i===1){ctx.beginPath();ctx.arc(nx,ny,5*scale,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.save();ctx.translate(nx,ny);ctx.rotate(Math.PI/4);ctx.fillRect(-4.5*scale,-4.5*scale,9*scale,9*scale);ctx.strokeRect(-4.5*scale,-4.5*scale,9*scale,9*scale);ctx.restore();}});
    const px=Math.cos(rotation)*radius,py=Math.sin(rotation)*radius;ctx.fillStyle=rgba(BRIGHT,.96);ctx.shadowColor=rgba(BRIGHT,.6);ctx.shadowBlur=8;ctx.beginPath();ctx.arc(px,py,2.6*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;const inner=.5+.5*Math.sin(time*2.5);ctx.strokeStyle=rgba(BRIGHT,.3+inner*.35);ctx.beginPath();ctx.moveTo(-11*scale,-4*scale);ctx.lineTo((3+inner*8)*scale,-4*scale);ctx.moveTo(-11*scale,5*scale);ctx.lineTo((8-inner*6)*scale,5*scale);ctx.stroke();ctx.restore();
  }

  function drawAudience(ctx, cx, cy, radius, alpha, time) {
    const points = [];
    ctx.save(); ctx.globalAlpha = alpha;
    [
      {count: 9, radius, depth: .42},
      {count: 7, radius: radius * .78, depth: .34}
    ].forEach((row, rowIndex) => {
      for (let i = 0; i < row.count; i++) {
        const a = Math.PI * (.12 + .76 * (i / (row.count - 1)));
        const x = cx + Math.cos(a) * row.radius;
        const y = cy + Math.sin(a) * row.radius * row.depth + rowIndex * 4;
        points.push({x, y});
        const active = (Math.floor(time * 1.15) + i + rowIndex * 3) % 11 === 0;
        ctx.fillStyle = rgba(active ? BRIGHT : STEEL, active ? .94 : .42);
        ctx.beginPath(); ctx.arc(x, y, active ? 3 : 1.9, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
    return points;
  }

  function curvePoint(a, control, b, p) {
    const q=1-p;
    return {
      x:q*q*a.x+2*q*p*control.x+p*p*b.x,
      y:q*q*a.y+2*q*p*control.y+p*p*b.y
    };
  }

  function drawDialogueField(ctx, author, discussant, audience, time, alpha) {
    const nodes=[author,discussant,...audience];
    const audienceIndex=(n)=>2+(Math.abs(n)%audience.length);
    const hash=(n)=>{
      const value=Math.sin(n*12.9898)*43758.5453;
      return value-Math.floor(value);
    };
    ctx.save();
    for(let i=0;i<12;i++) {
      const duration=5.6+hash(i+17)*3.2;
      const shifted=time+hash(i+31)*duration;
      const exchange=Math.floor(shifted/duration);
      const exchangePhase=(shifted/duration)%1;
      const seed=i*97+exchange*131;
      let from;
      let to;
      switch(i%6) {
        case 0: from=0; to=audienceIndex(Math.floor(hash(seed+1)*audience.length)); break;
        case 1: from=audienceIndex(Math.floor(hash(seed+2)*audience.length)); to=0; break;
        case 2: from=0; to=audienceIndex(Math.floor(hash(seed+3)*audience.length)); break;
        case 3: from=1; to=audienceIndex(Math.floor(hash(seed+4)*audience.length)); break;
        case 4: from=audienceIndex(Math.floor(hash(seed+5)*audience.length)); to=1; break;
        default:
          from=i%12===5?0:1;
          to=from===0?1:0;
      }
      const life=progress(exchangePhase,0,.18)*(1-progress(exchangePhase,.78,1))*alpha;
      const a=nodes[from], b=nodes[to];
      const dx=b.x-a.x, dy=b.y-a.y;
      const length=Math.hypot(dx,dy)||1;
      const bend=(hash(seed+8)-.5)*Math.min(90,length*.3);
      const control={x:(a.x+b.x)/2-dy/length*bend,y:(a.y+b.y)/2+dx/length*bend};
      const principalPair=from<2&&to<2;
      const color=principalPair?(from===0?AUTHOR:BRIGHT):((from===0||to===0)?AUTHOR:BRIGHT);

      // A faint base keeps every phrase anchored to an active conversation.
      ctx.strokeStyle=rgba(color,.055*life);
      ctx.lineWidth=.55;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(control.x,control.y,b.x,b.y); ctx.stroke();

      // Slow changes in weight make the thread breathe rather than behave like a wire.
      for(let segment=0;segment<24;segment++) {
        const p0=segment/24, p1=(segment+1)/24, midpoint=(p0+p1)/2;
        const wave=Math.pow(.5+.5*Math.sin(midpoint*Math.PI*2-time*.62+i*.83),3);
        const start=curvePoint(a,control,b,p0);
        const end=curvePoint(a,control,b,p1);
        ctx.strokeStyle=rgba(color,(.018+wave*.07)*life);
        ctx.lineWidth=.52+wave*.62;
        ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(end.x,end.y); ctx.stroke();
      }

      // Irregular punctuation-like packets move both ways without a leading head.
      for(let packet=0;packet<2;packet++) {
        let center=(time*(.017+(i%3)*.0025)+hash(seed+20+packet*7)+packet*.43)%1;
        if((i+packet)%2===1)center=1-center;
        const offsets=[-.038,-.021,-.006,.025,.046];
        offsets.forEach((offset,markIndex)=>{
          if((markIndex+i+packet)%5===3)return;
          const p=clamp(center+offset);
          const point=curvePoint(a,control,b,p);
          const before=curvePoint(a,control,b,clamp(p-.006));
          const after=curvePoint(a,control,b,clamp(p+.006));
          const tangent=Math.atan2(after.y-before.y,after.x-before.x);
          const edgeFade=progress(p,0,.06)*(1-progress(p,.94,1));
          ctx.save(); ctx.translate(point.x,point.y); ctx.rotate(tangent);
          if((markIndex+i)%3===0) {
            ctx.fillStyle=rgba(color,.46*life*edgeFade);
            ctx.beginPath(); ctx.arc(0,0,.72,0,Math.PI*2); ctx.fill();
          } else {
            const markLength=1.5+((markIndex+i)%2)*1.2;
            ctx.strokeStyle=rgba(color,.42*life*edgeFade);
            ctx.lineWidth=.7;
            ctx.beginPath(); ctx.moveTo(-markLength,0); ctx.lineTo(markLength,0); ctx.stroke();
          }
          ctx.restore();
        });
      }
    }
    ctx.restore();
  }

  function drawScene(ctx, w, h, time) {
    const scale = Math.max(.72, Math.min(1, w / 900));
    const cx = w * .5;
    const submit = progress(time,.45,1.9);
    const review = progress(time, 2.0, 2.85) * (1-progress(time, 5.75, 6.55));
    const accepted = progress(time, 5.2, 5.95);
    const chosen = progress(time, 5.55, 6.5);
    const illumination = progress(time, 6.05, 7.8) * (1-progress(time, 9.45, 10.25));
    const insight = progress(time, 6.95, 8.35) * (1-progress(time, 9.15, 10.1));
    const paperContracts = progress(time, 9.2, 10.55);
    const forum = progress(time, 9.7, 11.35) * (1-progress(time, 17.15, 17.9));
    const dialogue = progress(time, 10.95, 12.1) * (1-progress(time, 17.0, 17.8));
    const overall = progress(time, 0, .55) * (1-progress(time, 17.55, 17.98));

    const author = {x:Math.max(36,w*.15),y:h*.47};
    const paperWidth=Math.min(w*.18,156);
    const paperStart=author.x+paperWidth*.82;
    const paper = {x:mix(paperStart,cx,submit),y:h*.47,w:paperWidth,h:paperWidth*1.34};
    const compactWidth=Math.max(34,paperWidth*.34);
    const displayedPaper={
      x:mix(paper.x,cx,paperContracts),
      y:mix(paper.y,h*.565,paperContracts),
      w:mix(paper.w,compactWidth,paperContracts),
      h:0
    };
    displayedPaper.h=displayedPaper.w*1.34;
    const reviewerX = Math.min(w-36,w*.85);
    const spread = Math.min(h*.15,105);
    const apertures = [
      {x:reviewerX,y:paper.y-spread},
      {x:reviewerX,y:paper.y},
      {x:reviewerX,y:paper.y+spread}
    ];
    const appear = progress(time,.2,.9);

    ctx.save(); ctx.globalAlpha = overall;
    drawAperture(ctx,author.x,author.y,scale,appear,false,AUTHOR);

    apertures.forEach((aperture, i) => {
      const sideFade = i === 1 ? 1 : 1-chosen;
      drawAperture(ctx, aperture.x, aperture.y, scale, appear * sideFade, i === 1 && chosen > .2);
      const target = {x:paper.x+paper.w*.32,y:paper.y+(i-1)*paper.h*.24};
      const scan = (time * (.19 + i*.035) + i*.27) % 1;
      drawNarrowBeam(ctx, aperture, target, paper, review * sideFade, scan, scale);
    });

    const wideWidth = mix(paper.w*.5,Math.min(w*.56,520),illumination);
    drawWideLight(ctx, apertures[1], paper, wideWidth, illumination, scale);

    // Acceptance is a quiet pulse, not a verdict stamp.
    if (accepted > 0 && accepted < 1) {
      ctx.strokeStyle = rgba(BRIGHT, (1-accepted)*.5);
      ctx.beginPath(); ctx.arc(paper.x,paper.y, paper.w*.6 + accepted*34,0,Math.PI*2); ctx.stroke();
    }

    const ix = Math.min(w*.18,175), iy = Math.min(h*.17,112);
    drawHypothesis(ctx,paper.x-ix,paper.y-iy,scale,insight,time);
    drawPlot(ctx,paper.x+ix,paper.y-iy,scale,insight,time);
    drawExperiment(ctx,paper.x-ix,paper.y+iy,scale,insight,time);
    drawIteration(ctx,paper.x+ix,paper.y+iy,scale,insight,time);

    if (forum > 0) {
      ctx.globalAlpha = forum;
      const audienceCenter = {x:cx,y:h*.68};
      const audience = drawAudience(ctx,audienceCenter.x,audienceCenter.y,Math.min(w*.32,300),forum,time);
      const discussant=apertures[1];
      drawDialogueField(ctx,author,discussant,audience,time,dialogue);
      ctx.globalAlpha = 1;
    }
    drawPaper(ctx,displayedPaper.x,displayedPaper.y,displayedPaper.w,displayedPaper.h,appear,accepted);
    ctx.restore();
  }

  class Animation {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext("2d");
      this.toggle=document.querySelector('[data-action="toggle"]');
      this.replay=document.querySelector('[data-action="replay"]');
      this.elapsed=frozenTime ?? (reduceMotion ? 15.4 : 0);
      this.paused=reduceMotion || frozenTime!==null;
      this.last=0; this.raf=0; this.visible=true;
      this.resize(); this.bind(); this.render();
      if(this.paused)this.setButton(true); else this.start();
    }
    resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.ctx.setTransform(d,0,0,d,0,0);this.render();}
    bind(){
      new ResizeObserver(()=>this.resize()).observe(this.canvas);
      new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;if(this.visible&&!this.paused)this.start();else this.stop();}).observe(this.canvas);
      this.toggle.addEventListener("click",()=>{this.paused=!this.paused;this.setButton(this.paused);if(this.paused)this.stop();else this.start();});
      this.replay.addEventListener("click",()=>{this.elapsed=0;this.last=0;this.render();if(!this.paused)this.start();});
      document.addEventListener("visibilitychange",()=>{if(document.hidden)this.stop();else if(this.visible&&!this.paused)this.start();});
    }
    setButton(p){this.toggle.textContent=p?"Play":"Pause";this.toggle.setAttribute("aria-pressed",String(p));}
    start(){if(this.raf)return;this.last=0;this.raf=requestAnimationFrame(n=>this.frame(n));}
    stop(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}
    frame(now){if(!this.raf)return;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;this.elapsed=(this.elapsed+dt)%DURATION;this.render();this.raf=requestAnimationFrame(n=>this.frame(n));}
    render(){if(!this.ctx||!this.w||!this.h)return;this.ctx.clearRect(0,0,this.w,this.h);drawScene(this.ctx,this.w,this.h,this.elapsed);}
  }

  new Animation(document.getElementById("discussant-study"));
})();
