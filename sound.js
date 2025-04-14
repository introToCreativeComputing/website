// noise 컬러별로 반응

let myCanvas;
let mainGraphics;
let mic;
let fft;
let prevVol = 0;
let mountainAmp = 0;
const minAmp = 0.15; // 💡 최소 산맥 강도 (평지 대신 완만한 언덕 느낌)

// 새로운 전역 변수: 현재 활성화된 노이즈와 노이즈 타입
let activeNoise = null;
let activeNoiseType = "";

function setup() {
  myCanvas = createCanvas(windowWidth, windowWidth * 0.75);
  mainGraphics = createGraphics(width, height);
  mainGraphics.background(0);

  mic = new p5.AudioIn();
  mic.start();

  // fft 객체 생성: smoothing 값 0.9, 128 bins
  fft = new p5.FFT(0.9, 128);
  fft.setInput(mic);

  // 오른쪽 상단에 노이즈 버튼 추가
  let whiteButton = createButton("White Noise");
  whiteButton.position(windowWidth - 150, 20);
  whiteButton.mousePressed(() => {
    if (activeNoise) { activeNoise.stop(); }
    activeNoise = new p5.Noise("white");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "white";
  });

  let brownButton = createButton("Brown Noise");
  brownButton.position(windowWidth - 150, 60);
  brownButton.mousePressed(() => {
    if (activeNoise) { activeNoise.stop(); }
    activeNoise = new p5.Noise("brown");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "brown";
  });

  let pinkButton = createButton("Pink Noise");
  pinkButton.position(windowWidth - 150, 100);
  pinkButton.mousePressed(() => {
    if (activeNoise) { activeNoise.stop(); }
    activeNoise = new p5.Noise("pink");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "pink";
  });
}

function getAudioFeatures() {
  let vol = mic.getLevel();
  let volume = max(0.3, map(vol, 0, 0.2, 0.3, 2.5));
  let pitch = lerp(prevVol, vol, 0.7) * 10;
  pitch = constrain(pitch, 0, 5.0);
  prevVol = vol;

  // 마이크 입력이 살짝 있어도 산 효과가 나타나게 하되, 최소 강도는 minAmp로 설정
  let targetAmp = vol > 0.01 ? 1 : minAmp;
  mountainAmp = lerp(mountainAmp, targetAmp, 0.1);

  return { volume, pitch };
}

function draw() {
  let { volume, pitch } = getAudioFeatures();

  // FFT 분석: 저음과 고음 에너지 추출 → 주기로 활용 (이전 예제와 동일)
  let bassEnergy = fft.getEnergy("bass");
  let trebleEnergy = fft.getEnergy("treble");
  let ratio = bassEnergy / (bassEnergy + trebleEnergy + 0.0001);
  let periodMultiplier = map(ratio, 0, 1, 0.5, 3);

  // 트레일 효과: 이전 프레임의 그래픽을 살짝 아래로 복사
  mainGraphics.push();
    mainGraphics.image(mainGraphics, 0, 2);
  mainGraphics.pop();

  mainGraphics.push();
    // 산 그리기 영역을 위로 이동
    mainGraphics.translate(0, -200);

    // 노이즈 타입에 따라 산의 색상을 정합니다.
    // 버튼을 누르지 않았다면 기본 흰색
    let strokeColor;
    if (activeNoiseType === "white") {
      strokeColor = color(255);              // 흰색
    } else if (activeNoiseType === "brown") {
      strokeColor = color(139, 69, 19);        // 갈색
    } else if (activeNoiseType === "pink") {
      strokeColor = color(255, 192, 203);      // 분홍색
    } else {
      strokeColor = color(255);
    }
    // 동적인 알파값 적용
    let alphaVal = map(sin(frameCount / (10 + (1 - volume) * 300)), -1, 1, 80, 255);
    strokeColor.setAlpha(alphaVal);
    mainGraphics.stroke(strokeColor);

    mainGraphics.strokeWeight(1.25);
    mainGraphics.noFill();
    mainGraphics.beginShape();
  
    for (let x = 0; x < width; x += 5) {
      let baseY =
        mountainAmp * (
          volume * sin(x / ((50 - pitch * 5) * periodMultiplier) + frameCount / 40) * 50 +
          volume * sin(x / ((15 - pitch) * periodMultiplier) + frameCount / 30) * 20 +
          volume *
            noise(x / 100, frameCount / 40) *
            noise(x / 400, frameCount / 40) *
            map(sin(x / (10 + noise(x / 800, frameCount / 300) * 60)), -1, 1, 0, 1) *
            height / 4 +
          noise(x / 40, frameCount / 60) * 80
        ) +
        height / 2;
  
      if (pitch > 1.5) {
        if (int(x + frameCount * 0.5) % int(10 + noise(frameCount * 0.02) * 20) === 0) {
          let peakNoise = noise(x * 0.02, frameCount * 0.02);
          let peakOffset = map(peakNoise, 0, 1, -pitch * 60, -pitch * 15);
          baseY += mountainAmp * peakOffset;
        }
      }
  
      mainGraphics.curveVertex(x, baseY);
    }
  
    mainGraphics.endShape();
  mainGraphics.pop();

  image(mainGraphics, 0, 0);

  push();
    fill(255);
    textSize(60);
    textStyle(BOLD);
    text("MOUNTAIN & SAND\nAND ME", 50, 140);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowWidth * 0.75);
}
