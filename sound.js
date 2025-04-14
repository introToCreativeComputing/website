let myCanvas;
let mainGraphics;
let mic;
let fft;
let masterGain; // 마이크와 노이즈를 믹싱할 노드
let prevVol = 0;
let mountainAmp = 0;
const minAmp = 0.15; // 최소 산맥 강도
let polySynth;
let resetting = false;   // 리셋 동작 중인가?
let fadeAmt = 0;       // 0‥255 투명도
let fadeDir = 1;       // +1: out,  ‑1: in
const FADE_STEP = 12;      // 한 프레임당 투명도 변화량


let activeNoise = null;
let activeNoiseType = "";

// 슬라이더 변수 (노이즈 볼륨 조절용)
let noiseVolSlider;

let filter, delayEffect, reverb;

// PolySynth 코드 재생 관련 변수
let lastPlayedChord = "";
let updateInterval = 240; // 약 2초 (60fps 기준)

// 화음 재생 켜고 끄는 여부 플래그
let chordEnabled = false;



function setup() {
  myCanvas = createCanvas(windowWidth, windowHeight);
  mainGraphics = createGraphics(width, height);
  mainGraphics.background(0);
  let resetButton = createButton("Reset");
  resetButton.position(windowWidth - 150, 220);
  resetButton.mousePressed(() => {
    // 페이드‑아웃 시작
    resetting = true;
    fadeDir = 1;    // out
    fadeAmt = 0;
  });
  // 마이크 준비
  mic = new p5.AudioIn();
  mic.start();

  // fft 객체 생성: smoothing 값 0.9, 128 bins (산형 시각화를 위해 128 사용)
  fft = new p5.FFT(0.9, 128);
  fft.setInput(mic);

  // PolySynth 생성 및 이펙트 체인 설정
  polySynth = new p5.PolySynth();
  polySynth.disconnect(); // 기본 출력 연결을 끊고 아래 체인으로 연결

  filter = new p5.Filter("lowpass");
  filter.set(2000, 5); // cutoff 2000Hz, resonance 5

  delayEffect = new p5.Delay();
  reverb = new p5.Reverb();

  polySynth.connect(filter);
  filter.connect(delayEffect);
  delayEffect.connect(reverb);
  reverb.connect(getAudioContext().destination);
  console.log("오디오 초기화 및 이펙트 체인 설정 완료");

  // MasterGain (마이크와 노이즈 믹싱용)
  masterGain = new p5.Gain();
  masterGain.amp(1);

  // Mic UI
  let micOnButton = createButton("Mic On");
  micOnButton.position(windowWidth - 250, 20);
  micOnButton.mousePressed(() => {
    mic.start();
  });

  let micOffButton = createButton("Mic Off");
  micOffButton.position(windowWidth - 250, 60);
  micOffButton.mousePressed(() => {
    mic.stop();
  });

  // 화음 제어 버튼 (Chord On / Chord Off)
  let chordOnButton = createButton("Chord On");
  chordOnButton.position(windowWidth - 250, 100);
  chordOnButton.mousePressed(() => {
    chordEnabled = true;
    console.log("Chord playback enabled");
  });

  let chordOffButton = createButton("Chord Off");
  chordOffButton.position(windowWidth - 250, 140);
  chordOffButton.mousePressed(() => {
    chordEnabled = false;
    console.log("Chord playback disabled");
  });

  // Noise UI
  let muteButton = createButton("Mute");
  muteButton.position(windowWidth - 150, 140);
  muteButton.mousePressed(() => {
    if (activeNoise) {
      activeNoise.stop();
      activeNoise.disconnect();
      activeNoise = null;
    }
    activeNoiseType = "";
  });

  let whiteButton = createButton("White Noise");
  whiteButton.position(windowWidth - 150, 20);
  whiteButton.mousePressed(() => {
    if (activeNoise) {
      activeNoise.stop();
      activeNoise.disconnect();
    }
    activeNoise = new p5.Noise("white");
    activeNoise.amp(0.15);
    activeNoise.start();
    activeNoiseType = "white";
  });

  let brownButton = createButton("Brown Noise");
  brownButton.position(windowWidth - 150, 60);
  brownButton.mousePressed(() => {
    if (activeNoise) {
      activeNoise.stop();
      activeNoise.disconnect();
    }
    activeNoise = new p5.Noise("brown");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "brown";
  });

  let pinkButton = createButton("Pink Noise");
  pinkButton.position(windowWidth - 150, 100);
  pinkButton.mousePressed(() => {
    if (activeNoise) {
      activeNoise.stop();
      activeNoise.disconnect();
    }
    activeNoise = new p5.Noise("pink");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "pink";
  });

  // 볼륨 슬라이더 UI (배경 노이즈 볼륨 조절)
  noiseVolSlider = createSlider(0, 1, 0.5, 0.01);
  noiseVolSlider.position(windowWidth - 250, 180);
}



// window offset 함수: 각 노이즈 타입별로 x 좌표에 따른 추가 오프셋(픽셀 값)을 반환
function getWindowOffset(x, noiseType) {
  switch (noiseType) {
    case "white":
      return 0; // 변동 없음
    case "brown":
      // 왼쪽은 offset 0, 오른쪽으로 갈수록 산 높이가 줄어드는 효과
      return map(x, 0, width, 0, height * 0.5);
    case "pink":
      // 중앙 강조: 가운데에서 offset을 높게 부여하고 양쪽으로 갈수록 낮아짐
      return map(x, 0, width, -height * 0.25, height * 0.25);
    case "":
      return height * 0.3;
    default:
      return 0;
  }
}



function getAudioFeatures() {
  let vol = mic.getLevel(0.5);
  let volume = max(0.5, map(vol, 0, 0.2, 0.5, 3.0));
  let pitch = lerp(prevVol, vol, 0.3) * 50;
  pitch = constrain(pitch, 0, 100.0);
  prevVol = vol;

  // 마이크 입력에 따라 산의 전체 진폭 조절
  let targetAmp = vol > 0.01 ? 1 : minAmp;
  mountainAmp = lerp(mountainAmp, targetAmp, 0.1);

  return { volume, pitch };
}



function draw() {
  let { volume, pitch } = getAudioFeatures();

  // 활성화된 노이즈가 있으면 슬라이더 값에 따라 amp 업데이트
  if (activeNoise) {
    activeNoise.amp(noiseVolSlider.value());
  }

  // 트레일 효과: 이전 프레임 이미지 일부 복사
  mainGraphics.push();
  mainGraphics.image(mainGraphics, 0, 2);
  mainGraphics.pop();

  mainGraphics.push();
  // 산 그리기 영역을 위로 이동
  mainGraphics.translate(0, -200);

  // 노이즈 타입에 따라 산의 색상 결정
  let strokeColor;
  if (activeNoiseType === "white") {
    strokeColor = color(255);
  } else if (activeNoiseType === "brown") {
    strokeColor = color(139, 69, 19);
  } else if (activeNoiseType === "pink") {
    strokeColor = color(255, 192, 203);
  } else if (activeNoiseType === "green") {
    strokeColor = color(100, 255, 100);
  } else {
    strokeColor = color(100);
  }
  let alphaVal = map(sin(frameCount / (10 + (1 - volume) * 300)), -1, 1, 80, 255);
  strokeColor.setAlpha(alphaVal);
  mainGraphics.stroke(strokeColor);
  mainGraphics.strokeWeight(1.25);
  mainGraphics.noFill();

  mainGraphics.beginShape();
  for (let x = 0; x < width; x += 5) {
    // 기존 산 모양 수식 계산
    let baseY =
      mountainAmp *
      (volume * sin(x / (50 - pitch * 5) + frameCount / 40) * 50 +
        volume * sin(x / (15 - pitch) + frameCount / 30) * 20 +
        (volume *
          noise(x / 100, frameCount / 40) *
          noise(x / 400, frameCount / 40) *
          map(sin(x / (10 + noise(x / 800, frameCount / 300) * 60)), -1, 1, 0, 1) *
          height) /
        4 +
        noise(x / 40, frameCount / 60) * 80) +
      height * 0.75;

    // 기존 봉우리 효과
    if (pitch > 1.5) {
      if (int(x + frameCount * 0.5) % int(10 + noise(frameCount * 0.02) * 20) === 0) {
        let peakNoise = noise(x * 0.02, frameCount * 0.02);
        let peakOffset = map(peakNoise, 0, 1, -pitch * 60, -pitch * 15);
        baseY += mountainAmp * peakOffset;
      }
    }

    // 각 x 위치에 따른 window offset을 더해준다.
    let windowOffset = getWindowOffset(x, activeNoiseType);
    baseY += windowOffset;

    mainGraphics.curveVertex(x, baseY);
  }
  mainGraphics.endShape();
  mainGraphics.pop();

  image(mainGraphics, 0, 0);

  // FFT를 통한 주파수 분석 및 chord 재생 기능
  let spectrum = fft.analyze();
  let maxAmpSpec = 0;
  let maxIndex = 0;
  for (let i = 0; i < spectrum.length; i++) {
    if (spectrum[i] > maxAmpSpec) {
      maxAmpSpec = spectrum[i];
      maxIndex = i;
    }
  }
  let nyquist = getAudioContext().sampleRate / 2;
  let dominantFreq = maxIndex * (nyquist / spectrum.length);

  push();
  fill(0);
  textSize(16);
  text("Dominant Frequency: " + nf(dominantFreq, 1, 2) + " Hz", 20, 20);
  pop();

  // updateInterval마다, 그리고 chordEnabled가 true일 때 dominantFreq 기반 chord 재생
  if (chordEnabled && frameCount % updateInterval === 0 && dominantFreq > 50) {
    let baseMidi = freqToMidi(dominantFreq);
    let root = midiToNote(baseMidi);
    let third = midiToNote(baseMidi + 4);
    let fifth = midiToNote(baseMidi + 7);

    let chordStr = root + "-" + third + "-" + fifth;
    if (chordStr !== lastPlayedChord) {
      lastPlayedChord = chordStr;
      console.log("Playing chord: " + chordStr);
      // 3초간 재생 (velocity 0.5)
      polySynth.play(root, 0.5, 0, 3);
      polySynth.play(third, 0.5, 0, 3);
      polySynth.play(fifth, 0.5, 0, 3);
    }
  }

  push();
  fill(255);
  textSize(60);
  textStyle(BOLD);
  text("Silent Noisy Mountain", 50, 140);
  pop();
  if (resetting) {
    // 투명도 업데이트
    fadeAmt = constrain(fadeAmt + FADE_STEP * fadeDir, 0, 255);

    // 어두운 사각형으로 화면 덮기
    push();
    noStroke();
    fill(0, fadeAmt);
    rect(0, 0, width, height);
    pop();

    // 페이드‑아웃이 완전히 끝났을 때(=완전 검정)
    if (fadeDir === 1 && fadeAmt >= 255) {
      /* === 여기서 초기화하고 싶은 것들 수행 === */
      mainGraphics.clear();
      mainGraphics.background(0);
      lastPlayedChord = "";
      // 필요하다면 mountainAmp, prevVol 등도 리셋

      // 페이드‑인 시작
      fadeDir = -1;
    }

    // 페이드‑인이 모두 끝났으면 리셋 종료
    if (fadeDir === -1 && fadeAmt <= 0) {
      resetting = false;
    }
  }
}



// helper: 주파수를 MIDI 값으로 변환 (공식: midi = 69 + 12 * log2(freq / 440))
function freqToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}



// helper: MIDI 값을 음표 문자열로 변환 (예: 60 -> "C4")
function midiToNote(midi) {
  let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let octave = Math.floor(midi / 12) - 1;
  let noteIndex = midi % 12;
  return noteNames[noteIndex] + octave;
}



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
