let train, song, fft;
const SEG_W = 4;   // 레일의 각 점이 차지하는 가로 픽셀 폭
let rail = [];     // y좌표를 저장할 배열
let circleSize = 100;
let loaderElement = document.getElementById('loader');
let arrows = [];   // Arrow 객체 배열
let waveSentences = [];
const WAVE_STR = "ITS TI ME TO FOCUS            I MMERSI ON              PI NK NOI SE          WHI TE NOI SE            BROWN NOI SE             TELEVI SI ON STATI C              WIND            THUNDER             LET'S FOCUS   "; // 반복 문구 (끝에 공백 약간)
const SPAWN_GAP = 60;   // 다음 문장이 언제 등장할지(픽셀 간격
const WAVE_SPEED = 1.5;   // 왼→오 이동 속도
const AMP = 25;         // 파동 진폭
const FREQ = 0.015;     // 파동 주파수
const ARROW_COUNT = 3; // 생성할 화살표 개수
const WAVE_FONT_SIZE = 170;
function preload() {
    soundFormats('mp3', 'wav');
    train = loadImage('assets/train.png');
    song = loadSound('assets/bgBgm.wav');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("f1");   // 원하는 폰트 지정
    textAlign(LEFT, CENTER); // 왼쪽 정렬
    waveSentences.push(new WaveSentence(width)); fft = new p5.FFT(0.8, 1024);

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
    textSize(30); // 텍스트 크기
    text("Enter", width * 0.5, height * 0.8);
    for (let arrow of arrows) {
        arrow.update();
        arrow.display();
    }
    textSize(200); // 텍스트 크기

    if (song.isPlaying()) {
        // 마지막 문장이 일정 거리만큼 이동했으면 새 문장 추가
        let last = waveSentences[waveSentences.length - 1];
        if (!last || last.x + last.width() < width - SPAWN_GAP) {
            waveSentences.push(new WaveSentence(width));
        }
    }

    for (let i = waveSentences.length - 1; i >= 0; i--) {
        waveSentences[i].update();
        waveSentences[i].display();
        if (waveSentences[i].isOffScreen()) waveSentences.splice(i, 1);
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
class WaveSentence {
    constructor(startX) {
        this.x = startX;           // 왼쪽으로 흘러갈 기준 x
        this.baseY = height * 0.15; // 전체 문장의 기준 y
    }

    update() {
        this.x -= WAVE_SPEED;
    }

    display() {
        push();
        noStroke();
        fill(255);
        textSize(WAVE_FONT_SIZE);   // ← 크게!
        let cx = this.x;
        for (let i = 0; i < WAVE_STR.length; i++) {
            let ch = WAVE_STR.charAt(i);
            let yOffset = sin((cx * FREQ) + frameCount * 0.05) * AMP;
            text(ch, cx, this.baseY + yOffset);
            cx += textWidth(ch);      // 큰 글자 폭에 맞춰 이동
        }
        pop();
    }
    // 문장이 완전히 화면을 벗어났는지
    isOffScreen() {
        return this.x + this.width() < 0;
    }

    // 문장 전체 길이 계산
    width() {
        return textWidth(WAVE_STR);
    }
}
