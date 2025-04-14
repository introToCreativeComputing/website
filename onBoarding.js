let train, song, fft;
const SEG_W = 4;   // 레일의 각 점이 차지하는 가로 픽셀 폭
let rail = [];     // y좌표를 저장할 배열
let circleSize = 100;
let loaderElement = document.getElementById('loader');
let arrows = [];   // Arrow 객체 배열
const ARROW_COUNT = 3; // 생성할 화살표 개수
function preload() {
    soundFormats('mp3', 'wav');
    train = loadImage('assets/train.png');
    song = loadSound('assets/bgBgm.wav');
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    fft = new p5.FFT(0.8, 1024);

    noStroke();

    textAlign(CENTER, CENTER);
    for (let i = 0; i < ARROW_COUNT; i++) {
        let angle = map(i, 0, ARROW_COUNT, 0, TWO_PI);
        arrows.push(new Arrow(angle, 10));
    }
}

function draw() {
    loaderElement.style.display = 'none';
    background(0);

    if (song.isPlaying()) {
        fft.analyze();
        const bassEnergy = fft.getEnergy('bass');
        circleSize = map(bassEnergy, 0, 255, 20, 400);

        const targetY = map(bassEnergy, 0, 255, height * 0.9, height * -0.1);


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
    ellipse(width * 0.5, height * 0.8, circleSize);
    fill(255); // 텍스트 색상 (흰색)
    textSize(24); // 텍스트 크기
    text("Enter", width * 0.5, height * 0.8);
    for (let arrow of arrows) {
        arrow.update();
        arrow.display();
    }
}

function drawRail() {
    stroke(180);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 0; i < rail.length; i++) {

        const x = i * SEG_W;

        vertex(x, rail[i]);
    }
    endShape();
}

function drawTrain() {
    if (rail.length < 2) return;

    const i = rail.length - 1;
    const x = i * SEG_W;
    const y = rail[i];

    // 바로 전 점과 현재 점을 이용해서 기울기 계산
    const prevY = rail[i - 1];
    const angle = atan2(y - prevY, SEG_W); // SEG_W는 x 차이

    push();
    translate(x, y - 25);
    rotate(angle * 0.5); // 살짝만 회전 (보통 1:1 적용하면 과하게 돌아감)
    imageMode(CENTER);
    image(train, 0, 0, 100, 50);
    pop();
} class Arrow {
    constructor(baseAngle, radius) {
        this.baseAngle = baseAngle; // 마우스 기준 기본 오프셋 방향
        this.radius = radius;       // 기본 오프셋 거리
        // Perlin noise를 위한 랜덤 시드값
        this.seedX = random(1000);
        this.seedY = random(1000);
    }

    update() {
        // 기본 위치: 마우스 위치에서 radius만큼 떨어진 지점
        let baseX = this.radius * cos(this.baseAngle);
        let baseY = this.radius * sin(this.baseAngle);
        // Perlin noise를 통한 추가 오프셋 (진동 효과)
        let noiseFactor = 20; // 노이즈 적용 크기
        let offsetX = (noise(frameCount * 0.01 + this.seedX) - 0.5) * noiseFactor;
        let offsetY = (noise(frameCount * 0.01 + this.seedY) - 0.5) * noiseFactor;

        this.x = mouseX + baseX + offsetX;
        this.y = mouseY + baseY + offsetY;
    }

    display() {
        // 버튼(다음 페이지 이동 원)을 향하는 각도 계산
        let targetX = width * 0.5;
        let targetY = height * 0.8;
        let angle = atan2(targetY - this.y, targetX - this.x);
        let d = dist(this.x, this.y, targetX, targetY);
        let scaleFactor = map(d, 0, circleSize, 2, 1);
        // 원하는 범위 내에 있도록 클램핑 (최소 1, 최대 2)
        scaleFactor = constrain(scaleFactor, 1, 2);
        push();
        translate(this.x, this.y);
        rotate(angle);
        scale(scaleFactor);
        stroke(255);
        fill(255);
        line(0, 0, 15, 0);
        triangle(15, 0, 10, -4, 10, 4);
        pop();
    }
}

function mousePressed() {
    if (!song) return;
    if (song.isPlaying()) {
        song.pause();
    }
    else {
        song.play();
    }
    let d = dist(mouseX, mouseY, width * 0.5, height * 0.8);

    // 만약 클릭한 위치가 원 내부라면
    if (d < circleSize / 2) {
        // 다음 페이지로 이동 (예를 들어, nextpage.html)
        window.location.href = "mainContents.html";
    }
}
