'use strict';
const pixelSprites = {
    tree:[
        '        oo        ', '      ooggoo      ', '     oggllggo     ', '    ogllhhlggo    ',
        '   oglllhllgggo   ', '  oggllggllggggo  ', ' oggllggllggggggo ', ' ogllgggggllggggo ',
        'oggllggllggggdgggo','oggllgggggggddgggo',' ogggllggggdddggo ', '  oggggggddddggo  ',
        '   oddggddddddo   ', '    ooddddddoo    ', '      oottoo      ', '       ottto      ',
        '       ottto      ', '      ottttto     '
    ],
    rock:['    oooooo    ','  oollhhhloo  ',' olllhhhllldo ','ollllllllldddo','olllldlllddddo','olldddlldddddo',' oddddddddddo ','  ommmmddmmo  '],
    hero:['   oooooo   ','  occccllo  ',' occlllcllo ','occlllllccco','ocooeeeoooco','ocooeeeoooco',' occcccccco ','  oooooooo  ','  obbbbbbo  ','  obbllbbo  ','  oobbbboo  ','  oo    oo  '],
    enemy:['   oooooo   ','  occcccco  ',' occcccccco ','occllccclcco','ocoeecceecoo','ocoeecceecoo','occcccccccco',' occddddcco ','  oddddddo  ','  oooooooo  ','  oo    oo  '],
    gem:['   o   ','  olo  ',' olhlo ','olhhllo',' olllo ','  olo  ','   o   '],
    heal:['  ooooo  ',' olllllo ','olllhlllo','ollhhhllo','olllhlllo',' olllllo ','  ooooo  '],
    bomb:['    ll   ','   ol    ','  ooooo  ',' occccco ','oclhhccco','occccccco',' occccco ','  ooooo  '],
    magnet:[' oo   oo ','oll   llo','oll   llo','oll   llo','oll   llo',' olllllo ','  olllo  ','   ooo   ']
};
const spriteCache=new Map();
function spriteImage(name,color){
    const key=name+color;if(spriteCache.has(key))return spriteCache.get(key);
    const pattern=pixelSprites[name],w=Math.max(...pattern.map(r=>r.length)),img=document.createElement('canvas');img.width=w;img.height=pattern.length;
    const g=img.getContext('2d'),palette={o:'#0b1915',c:color||'#c6e99b',l:'#83b96b',h:'#c4dc8b',g:'#345e3d',d:'#243d30',t:'#755238',b:'#48584b',e:'#f6e8ae',m:'#4c7543'};
    if(name==='rock')Object.assign(palette,{l:'#727e70',h:'#a2ad91',d:'#434f48'});
    if(name==='hero')Object.assign(palette,{l:color||'#c6e99b',h:'#e8efb3'});
    if(name==='enemy')Object.assign(palette,{l:color||'#de866d',d:'#73445c',e:'#f9d3a3'});
    if(name==='gem')Object.assign(palette,{o:'#07324b',l:'#32d9ff',h:'#e0ffff'});
    if(name==='heal')Object.assign(palette,{l:'#45a879',h:'#d3ffe4'});
    if(name==='magnet')palette.l='#82c6ed';
    if(name==='bomb')Object.assign(palette,{c:'#686373',l:'#ffb663',h:'#a5a0aa'});
    for(let y=0;y<pattern.length;y++)for(let x=0;x<pattern[y].length;x++){const c=palette[pattern[y][x]];if(c){g.fillStyle=c;g.fillRect(x,y,1,1);}}
    spriteCache.set(key,img);return img;
}
function drawSprite(g,name,x,y,scale=2,color){const img=spriteImage(name,color);g.imageSmoothingEnabled=false;g.drawImage(img,Math.round(x-img.width*scale/2),Math.round(y-img.height*scale/2),img.width*scale,img.height*scale);}
function drawPixelGun(g,x,y,angle){
    g.save();g.translate(Math.round(x),Math.round(y));g.rotate(angle);
    g.fillStyle='#0b1915';g.fillRect(-2,-5,30,10);g.fillStyle='#6b8077';g.fillRect(0,-3,24,6);g.fillStyle='#bac4a2';g.fillRect(2,-3,16,2);g.fillStyle='#ebc77d';g.fillRect(22,-3,4,6);g.restore();
}

const portraitCache=new Map();
function heroPortrait(hero,large=false){
    if(!portraitCache.has(hero.id))portraitCache.set(hero.id,spriteImage('hero',hero.color).toDataURL());
    return `<span class="pixel-portrait ${large?'large':''}"><img src="${portraitCache.get(hero.id)}" alt="${hero.name}" width="72" height="72"></span>`;
}

// Iconos propios de las seis mejoras, dibujados en una cuadrícula de píxeles.
Object.assign(pixelSprites,{
    damage:['     oo     ','    ohho    ','    ohlo    ','   ohlllo   ','  ohlllllo  ',' ohlhhllldo ','ohllhhlllddo','ohlllllllddo',' oldllllddo ','  oddllddo  ','   oooooo   '],
    rapid:['      ooo   ','     ohho   ','    ohhlo   ','   ohhlo    ','  ohhlllloo ',' ohhhhhlllo ',' ooooolllo  ','     ollo   ','    ollo    ','   olo      ','   oo       '],
    boots:['   oooo     ','   ollo     ','   ollo     ','   ollo     ',' ooollo     ','ollhhlo     ','ollhhloooo  ','olllllllhlo ','olllllllllo ',' oddddddddo ',' oooooooooo '],
    heart:['  ooo ooo   ',' olhholhho  ','olhhhhhhllo ','olhhhhhlllo ','olhhhhllldo ',' olllllldo  ','  olllldo   ','   olldo    ','    odo     ','     o      ','            '],
    spread:['  oo    oo  ',' ohho  ohho ',' ohlo  ohlo ','  oo    oo  ','     oo     ','    ohho    ','    ohlo    ','     oo     ','    ollo    ','   ollllo   ','   oooooo   '],
    recovery:['    oooo    ','    ohho    ','    ohlo    ',' oooohloooo ','ohhhhhhhhllo','ohlllllllldo',' oooohloooo ','    ohlo    ','    oddo    ','    oooo    ','            ']
});
const upgradeIconCache=new Map();
function upgradeIcon(upgrade){
    const names={'✦':'damage','ϟ':'rapid','➚':'boots','♥':'heart','⋔':'spread','✚':'recovery','∩':'magnet','◎':'target','✧':'critical','▣':'shield'};
    const name=names[upgrade.icon];
    if(!upgradeIconCache.has(name))upgradeIconCache.set(name,spriteImage(name).toDataURL());
    return `<img src="${upgradeIconCache.get(name)}" width="72" height="66" alt="">`;
}

Object.assign(pixelSprites,{
    target:['   ooooo    ',' oollhlloo  ','olhooooohlo ','ollo   ollo ','ohlo o olho ','ollo   ollo ','olhooooohlo ',' oollhlloo  ','   ooooo    '],
    critical:['     o      ','    oho     ','    oho     ','  oohohoo  ',' ohhhhhhhho ','  ooolooo   ','    olo     ','    olo     ','     o      '],
    shield:[' oooooooo   ','olhhhhhhlo  ','ollhlllllo  ','ollhlllllo  ','ollllldddo  ',' ollllddo   ','  ollldo    ','   oddo     ','    oo      ']
});
