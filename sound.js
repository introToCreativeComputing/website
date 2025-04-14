let myCanvas;
let mainGraphics;
let mic;
let fft;
let masterGain; // 마이크와 노이즈를 믹싱할 노드
let prevVol = 0;
let mountainAmp = 0;
const minAmp = 0.15; // 최소 산맥 강도
let polySynth;

// 현재 활성화된 노이즈와 노이즈 타입
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

  // Mic UI
  let micOnButton = createButton("Mic On");
  micOnButton.position(windowWidth - 280, 20);
  micOnButton.style("background-color", "#ffffff");
  micOnButton.style("color", "#333");
  micOnButton.style("border", "none");
  micOnButton.style("padding", "5px 10px");
  micOnButton.style("font-family", "Arial, sans-serif");
  micOnButton.style("border-radius", "5px");

  micOnButton.mousePressed(() => {
    mic.start();
  });

  let micOffButton = createButton("Mic Off");
  micOffButton.position(windowWidth - 280, 60);
  micOffButton.style("background-color", "#ffffff");
  micOffButton.style("color", "#333");
  micOffButton.style("border", "none");
  micOffButton.style("padding", "5px 10px");
  micOffButton.style("font-family", "Arial, sans-serif");
  micOffButton.style("border-radius", "5px");
  micOffButton.mousePressed(() => {
    mic.stop();
  });

  // 화음 제어 버튼 (Chord On / Chord Off)
  let chordOnButton = createButton("Chord On");
  chordOnButton.position(windowWidth - 280, 100);
  chordOnButton.style("background-color", "#ffffff");
  chordOnButton.style("color", "#333");
  chordOnButton.style("border", "none");
  chordOnButton.style("padding", "5px 10px");
  chordOnButton.style("font-family", "Arial, sans-serif");
  chordOnButton.style("border-radius", "5px");

  chordOnButton.mousePressed(() => {
    chordEnabled = true;
    console.log("Chord playback enabled");
  });

  let chordOffButton = createButton("Chord Off");
  chordOffButton.position(windowWidth - 280, 140);
  chordOffButton.style("background-color", "#ffffff");
  chordOffButton.style("color", "#333");
  chordOffButton.style("border", "none");
  chordOffButton.style("padding", "5px 10px");
  chordOffButton.style("font-family", "Arial, sans-serif");
  chordOffButton.style("border-radius", "5px");

  chordOffButton.mousePressed(() => {
    chordEnabled = false;
    console.log("Chord playback disabled");
  });

  // Noise UI
  let muteButton = createButton("Mute");
  muteButton.position(windowWidth - 150, 140);
  muteButton.style("background-color", "#ffffff");
  muteButton.style("color", "#333");
  muteButton.style("border", "none");
  muteButton.style("padding", "5px 10px");
  muteButton.style("font-family", "Arial, sans-serif");
  muteButton.style("border-radius", "5px");

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
  whiteButton.style("background-color", "#ffffff");
  whiteButton.style("color", "#333");
  whiteButton.style("border", "none");
  whiteButton.style("padding", "5px 10px");
  whiteButton.style("font-family", "Arial, sans-serif");
  whiteButton.style("border-radius", "5px");

  whiteButton.mousePressed(() => {
    if (activeNoise) {
      activeNoise.stop();
      activeNoise.disconnect();
    }
    activeNoise = new p5.Noise("white");
    activeNoise.amp(0.5);
    activeNoise.start();
    activeNoiseType = "white";
  });

  let brownButton = createButton("Brown Noise");
  brownButton.position(windowWidth - 150, 60);
  brownButton.style("background-color", "#ffffff");
  brownButton.style("color", "#333");
  brownButton.style("border", "none");
  brownButton.style("padding", "5px 10px");
  brownButton.style("font-family", "Arial, sans-serif");
  brownButton.style("border-radius", "5px");

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
  pinkButton.style("background-color", "#ffffff");
  pinkButton.style("color", "#333");
  pinkButton.style("border", "none");
  pinkButton.style("padding", "5px 10px");
  pinkButton.style("font-family", "Arial, sans-serif");
  pinkButton.style("border-radius", "5px");

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

  // 볼륨 슬라이더 UI (배경 노이즈 및 화음 볼륨 조절)
  noiseVolSlider = createSlider(0, 1, 0.5, 0.01);
  noiseVolSlider.position(windowWidth - 240, 190);
}

//
// window offset 함수: 각 노이즈 타입별로 x 좌표에 따른 추가 오프셋(픽셀 값)을 반환
//
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
  fill(255);
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
      push();
      fill(255);
      textSize(16);
      text("Playing chord: " + chordStr, 20, 40);
      pop();

      lastPlayedChord = chordStr;

      console.log("Playing chord: " + chordStr);

      // 여기서 velocity를 noiseVolSlider.value()를 사용하여 chord 볼륨도 조절
      polySynth.play(root, noiseVolSlider.value(), 0, 3);
      polySynth.play(third, noiseVolSlider.value(), 0, 3);
      polySynth.play(fifth, noiseVolSlider.value(), 0, 3);
    }
  }

  push();
  fill(255);
  textSize(60);
  textStyle(BOLD);
  text("Silent Noisy Mountain", 50, 140);
  pop();
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
