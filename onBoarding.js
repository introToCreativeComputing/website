let train, song, fft;
const SEG_W = 4;   // 레일의 각 점이 차지하는 가로 픽셀 폭
let rail = [];     // y좌표를 저장할 배열
let circleSize = 130;
let loaderElement = document.getElementById('loader');

function preload() {
soundFormats('mp3', 'wav');
train = loadImage('assets/train.png');
song = loadSound('assets/bgBgm.wav');}

function setup() {    
createCanvas(windowWidth * 0.9, windowHeight);
   
fft=new p5.FFT(0.8,1024);
   
noStroke();
   
textAlign(CENTER,CENTER);
}

function draw() {
    loaderElement.style.display = 'none';
    background(0);
        
    if (song.isPlaying()) {
    fft.analyze();
    const bassEnergy = fft.getEnergy('bass');
    circleSize = map(bassEnergy, 0, 255, 20, 400);
   
    const targetY = map(bassEnergy,0, 255, height * 0.9, height * -0.1);
            
    // Smooth 효과 적용
            
    const smoothFactor = 0.1;
    const y = rail.length > 0 ? lerp(rail[rail.length - 1], targetY, smoothFactor) : targetY;
    rail.push(y);
        
    if (rail.length * SEG_W > width - 60) {            
    rail.shift();
            }
        }
    drawRail();
    drawTrain();
    noFill();
    stroke(255);
    strokeWeight(3);
    ellipse(width*0.6, height*0.8, circleSize);
    fill(255); // 텍스트 색상 (흰색)
    textSize(24); // 텍스트 크기
    text("Enter", width * 0.6, height * 0.8);
}

function drawRail() {
stroke(180);
strokeWeight(2);
noFill();
beginShape();
for (let i = 0;i < rail.length; i++) {
     
const x = i * SEG_W;
        
vertex(x,rail[i]);
    }
endShape();
}

function drawTrain() {
   
if (rail.length === 0) return;
const i= rail.length - 1;
const x = i * SEG_W;
const y = rail[i];
push();
imageMode(CENTER);
image(train, x, y - 25, 100, 50);
pop();
}

function mousePressed() {
if (!song) return;
if (song.isPlaying()) {
song.pause();   } 
else {
song.play();
   }
   let d = dist(mouseX, mouseY, width / 2, height / 2);
  
   // 만약 클릭한 위치가 원 내부라면
   if (d < circleSize / 2) {
     // 다음 페이지로 이동 (예를 들어, nextpage.html)
     window.location.href = "mainContents.html";}
}
