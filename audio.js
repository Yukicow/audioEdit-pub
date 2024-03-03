/**
 * 권장사항
 * 1. Undo, Redo를 할 때에는 음악을 멈추고 하면 성능이 더 빠름
 * 2. 파일을 많이 올리면 메모리를 과하게 사용하고, 편집 작업이 느려짐
 *    -> 정말 길게 오디오를 만들 것이 아니면 필요한 부분만 잘라서 사용하고, 필요없는 데이터들은 삭제
 * 3. CPU 성능에 따라 속도 차이가 많이 남. 컴퓨터 사양에 따라 위의 권장사항을 꼭 지켜야 함.
 **/
/**
 * 성능에 대한 트레이드 오프
 * 1. 모든 AudioBuffer를 직접 갖도록 하는 형태로 메모리를 아주아주 많이 차지하는 대신 오디오 재생속도를 ㅈㄴ게 빠르게 만들 수 있음.
 *
 * 2. SourceNode의 AudioBuffer는 originSource를 이용하고, TrackNode에게는 AudioBuffer를 직접 갖고 있게 하는 방식.
 *    SourceNode가 직접 AudioBuffer를 갖는 게 아니기 때문에 Audio로 특정 동작을 할 때에 1번에 비해 조금 느리디.
 *    하지만 메모리 효율면에서 1번에 비해 매우 뛰어남
 *
 * 3. TrackNode에 AudioBuffer를 직접 갖고 있게 하는 방식으로 2번과 비슷하지만 Undo 또는 Redo 시에 TrackNode를 따로 저장하지 않고
 *    SourceNode를 이용해서 Undo Redo가 발생할 때 마다 새롭게 TrackNode를 초기화 해야하기 때문에 Undo Redo에서 속도가 좀 느림.
 *    단, Undo Redo에 대해서 TrackNode가 없기 때문에 메모리를 덜 차지함.
 *    이게 만약에 사용자가 매우 길이가 긴 오디오 파일을 첨부했다가 원하는 부분만 삭제하더라도, Undo에 남아있기 때문에
 *    AudioBuffer를 그대로 갖고 있는 방식은 안 그래도 OriginSource때문에 부담이 큰데 더더욱 부담을 크게 만들 수 있음
 *    그런 면에서 Undo Redo가 TrackNode의 AudioBuffer를 갖지 않는다는 것은 매우 큰 효율이다.
 *    Undo Redo 후에는 오디오 재생속도가 빠르지만, Undo Redo를 수행하는 속도 자체가 느리기 때문에 사용자가 불편해할 수 있음.
 *
 * 4. originSource를 이용해서 모든 동작마다 audioBuffer를 새롭게 생성하고 재생시킴
 *    메모리면에서 가장 효율적이지만 오디오 재생 속도가 가장 느림.
 *    Undo Redo는 빠르지만 오디오를 그 때 그 때 재생해야 하기 때문에 오디오를 재생할 때마다 느림.
 *
 * 5. TrackNode와 CombineBuffer를 변화가 있을 때 마다 바로 초기화하는 것이 아닌 오디오를 재생할 때만 해당 AudioBuffer 초기화하고,
 *    그 초기화된 AudioBuffer를 변경되기 전까지 계속 사용하는 방식으로 가장 효율적일 수 있는 방식이다.
 *    메모리를 조금 사용하기는 하지만 상대적으로 덜 사용하고 속도도 빠르다.
 *    사용자 입장에서는 오디오를 편집하고 처음 재생할 때에만 조금 기다리면 되고 그 후 재생속도는 매우 빠르다.
 *    밸런스가 잘 잡힌 방식으로 현재 사용하고 있는 방식.
 */
// AudioContext
let audioCtx = new AudioContext({ sampleRate: 44100 });
// 인덱스 관련 옵션
let trackNumber = 0;
let waveIndex = 0;
let fileIndex = 0;
let recordIndex = 0;
// play 관련 옵션
let isPlaying = false;
let isTrackPlaying = false;
let currentTrackAudioSource = null;
let currentTrackSound = null;
let currentTrackSoundStore = new Map(); // 현재 상태에서의 TrackSound 목록
let currentCombinedSource = null;
let currentCombinedBuffer = null;
let startOffset = 0;
let startTime = 0;
let endTime = 0;
// recording option
let recorder = null;
const recordedData = [];
// soundbar 길이 조정
const defaultMinWidth = 1500;
const limitPlayDuration = 900; // 타임라인은 최대 15분까지
let widthRatio = 8; // 초당 5px
let trackWidth = defaultMinWidth;
let maxPlayDuration = 1500 / widthRatio;
// Audio 관련 데이터
const numberOfChannels = 2;
const sampleRate = 44100;
let sourceStore = new Map(); // 모든 개별 SourceNode를 저장
let trackSourceStore = new Map(); // 트랙에 포함된 모든 source를 묶어 새 source를 만들고, 그 source로 생성된 SourceNode를 저장
let originSourceStore = new Map(); // sound 원본을 저장해 놓음
// Drag Move Option
let isDragging = false;
let dragStartX = 0;
let previousDragX = 0;
let dragStartSelectedBarLeft = 0;
// Drag Select option
const currentSelectedSourceList = new Set();
let currentSelectedSourceNode = null;
let currentSelectedTrack = null;
let selectedBarStart = 0;
let selectedBarEnd = 0;
let dragAreaStartX = 0;
let dragAreaStartY = 0;
// Copy option
let currentCopiedSourceList = new Set();
// Undo Redo Option
const undoSourceList = [];
const undoTrackList = [];
const redoSourceList = [];
const redoTrackList = [];
// OptionBar
const playButton = document.getElementById("play_button");
const initButton = document.getElementById("init_button");
const downloadButton = document.getElementById("download_button");
const ratioRange = document.getElementById("ratio");
const cutButton = document.getElementById("cut_button");
const deleteButton = document.getElementById("delete_button");
const timeInput = document.getElementById("time_input");
const timeAddButton = document.getElementById("time_add_button");
const trackAddButton = document.getElementById("track_add_button");
const undoButton = document.getElementById("undo_button");
const redoButton = document.getElementById("redo_button");
const recordButton = document.getElementById("record_button");
// FileWindow
const fileInput = document.getElementById("file");
const fileListBox = document.getElementById("file_list_box");
// Edit Window
let timeStickInterval = undefined;
let timeStick = null;
const editWindow = document.getElementById("edit_window");
const editContainer = document.getElementById("edit_cont");
const editBox = document.getElementById("edit_box");
const trackContainer = document.getElementById("track_cont");
const trackOption = document.getElementById("track_option");
const timeLineBox = document.getElementById("time_line_box");
const timeLine = document.getElementById("time_line");
// stick의 시작 위치
const stickStartOffset = 0; // timeLine.getBoundingClientRect().left - editBox.getBoundingClientRect().left (이 부분은 혹시 나중에 타임스틱이 특정 div에서 분리될 때 사용)
class BaseNode {
    constructor(trackNumber) {
        this.trackNumber = trackNumber;
        this.length = 0;
        this.duration = 0;
        this.gainValue = 1;
        this.trackKey = `track${trackNumber}`;
    }
    resetTrackNumber(trackNumber) {
        this.trackNumber = trackNumber;
        this.trackKey = "track" + trackNumber;
    }
    setGainValue(gainValue) {
        this.gainValue = gainValue;
    }
}
class SourceNode extends BaseNode {
    constructor(index, trackNumber, originSource) {
        super(trackNumber);
        this.index = index;
        this.originSource = originSource;
        this.length = originSource.audioBuffer
            ? originSource.audioBuffer.length
            : 0;
        this.duration = originSource.audioBuffer
            ? originSource.audioBuffer.duration
            : 0;
        this.startFrame = 0; // origin 소스를 기준으로 이 소스의 시작 프레임
        this.endFrame = this.startFrame + this.duration * sampleRate; // origin 소스를 기준으로 이 소스가 끝나는 프레임(= 총 플레이타임 * SampleRate )
        this.startTime = 0; // 트랙 내에서 이 소스가 시작하는 시간
        this.endTime = this.startTime + this.duration; // 트랙 내에서 이 소스가 끝나는 시간
        this.sourceKey = "source" + index;
        this.trackKey = "track" + trackNumber;
    }
    setStartTime(startTime) {
        this.startTime = startTime;
    }
    setDuration(duration) {
        this.duration = duration;
    }
    resetEndTime() {
        this.endTime = this.startTime + this.duration;
    }
    /**
     * @param startFrame
     * startFrame을 인자로 받아 startFrame과 endFrame을 재설정.
     * endFrame은 origin 오디오를 기준으로 하기 때문에 시작프레임에서 (총 플레이 길이 * SampleRate)를 더한 값
     */
    resetFrame(startFrame) {
        this.startFrame = startFrame;
        this.endFrame = this.startFrame + this.duration * sampleRate;
    }
    getAudioBuffer() {
        const mono = this.originSource.audioBuffer
            .getChannelData(0)
            .slice(this.startFrame, this.endFrame);
        const stereo =
            this.originSource.audioBuffer.numberOfChannels >= 2
                ? this.originSource.audioBuffer
                      .getChannelData(1)
                      .slice(this.startFrame, this.endFrame)
                : this.originSource.audioBuffer
                      .getChannelData(0)
                      .slice(this.startFrame, this.endFrame);
        const newAudioBuffer = new AudioBuffer({
            sampleRate: sampleRate,
            length: mono.length,
            numberOfChannels: 2,
        });
        newAudioBuffer.getChannelData(0).set(mono);
        newAudioBuffer.getChannelData(1).set(stereo);
        return newAudioBuffer;
    }
}
class TrackNode extends BaseNode {
    constructor(trackNumber, length, duration) {
        super(trackNumber);
        this.trackKey = `track${trackNumber}`;
        this.length = length;
        this.duration = duration;
    }
}
class OriginSource {
    constructor(fileIndex, fileName, audioBuffer) {
        this.fileIndex = fileIndex;
        this.fileName = fileName;
        this.audioBuffer = audioBuffer;
        this.fileKey = `file${fileIndex}`;
    }
}
class TrackSound {
    constructor(trackNumber, audioBuffer) {
        this.trackNumber = trackNumber;
        this.trackKey = `track${trackNumber}`;
        this.audioBuffer = audioBuffer;
    }
}
/**
 * Init Options
 */
drawTimeLine();
drawStick(0);
document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});
document.addEventListener("mousedown", (event) => {
    var _a;
    if (event.target instanceof HTMLElement) {
        if (event.target.id === "drag_box") {
            removeAllSelected();
        }
        if (event.target.classList.contains("option")) return; // option에 해당하는 작업은 modal이나 select된 값들이 필요하므로 유지
        (_a = document.getElementById("option_modal")) === null || _a === void 0
            ? void 0
            : _a.remove();
    }
});
document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "c") {
        if (currentSelectedSourceList.size === 0) {
            return;
        } else {
            currentCopiedSourceList.clear(); // Set을 한 번 초기화
            for (const source of currentSelectedSourceList.values()) {
                currentCopiedSourceList.add(source);
            }
        }
    }
});
document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "v") {
        if (currentSelectedTrack !== null) {
            pasteSource();
        }
    }
});
document.addEventListener("keydown", async function (event) {
    if (event.ctrlKey && event.key === "x") {
        event.stopPropagation();
        if (currentSelectedSourceList.size !== 0) {
            deleteSource();
        }
    }
});
document.addEventListener("keydown", async function (event) {
    if (!event.ctrlKey && event.key === "x") {
        if (currentSelectedTrack) {
            let selectedSource = null;
            const currentTime = getCurrentPlayTime();
            for (const source of sourceStore.values()) {
                if (source.trackKey === currentSelectedTrack.id) {
                    if (
                        source.startTime < currentTime &&
                        source.endTime > currentTime
                    ) {
                        selectedSource = source;
                    }
                }
            }
            if (selectedSource) await cutSound(selectedSource, currentTime);
        }
    }
});
document.addEventListener("keydown", async function (event) {
    if (event.ctrlKey && event.key === "z") {
        undo();
    }
});
function removeAllSelected() {
    var _a;
    (_a = document.getElementById("selected_bar")) === null || _a === void 0
        ? void 0
        : _a.remove();
    currentSelectedSourceNode = null;
    currentSelectedSourceList.clear();
}
downloadButton === null || downloadButton === void 0
    ? void 0
    : downloadButton.addEventListener("click", downloadMixedSound);
timeLine === null || timeLine === void 0
    ? void 0
    : timeLine.addEventListener("click", clickStartOffset);
initButton === null || initButton === void 0
    ? void 0
    : initButton.addEventListener("click", initPlayTime);
undoButton === null || undoButton === void 0
    ? void 0
    : undoButton.addEventListener("click", undo);
redoButton === null || redoButton === void 0
    ? void 0
    : redoButton.addEventListener("click", redo);
recordButton === null || recordButton === void 0
    ? void 0
    : recordButton.addEventListener("click", startRecording);
playButton === null || playButton === void 0
    ? void 0
    : playButton.addEventListener("click", () => {
          checkPlayReady(play);
      });
ratioRange === null || ratioRange === void 0
    ? void 0
    : ratioRange.addEventListener("input", () => {
          reflectRatio();
      });
ratioRange === null || ratioRange === void 0
    ? void 0
    : ratioRange.addEventListener("mouseup", () => {
          reflectRatio(true);
      });
function reflectRatio(needWave = false) {
    const beforeInputWidthRatio = widthRatio; // 기존의 widthRatio를 저장해 둠
    const changedWithRatio = parseFloat(ratioRange.value);
    const beforePlayTime = getCurrentPlayTime(); // widthRatio를 변경하기 전에 playTime을 계산해 놓아야 함
    widthRatio = changedWithRatio;
    drawTrack();
    drawAllWave(needWave);
    drawStick(beforePlayTime);
    drawTimeLine();
    drawSelectedBar(beforeInputWidthRatio);
}
cutButton === null || cutButton === void 0
    ? void 0
    : cutButton.addEventListener("click", (event) => {
          event.stopPropagation();
          if (currentSelectedTrack) {
              let selectedSource = null;
              const currentTime = getCurrentPlayTime();
              for (const source of sourceStore.values()) {
                  if (source.trackKey === currentSelectedTrack.id) {
                      if (
                          source.startTime < currentTime &&
                          source.endTime > currentTime
                      ) {
                          selectedSource = source;
                      }
                  }
              }
              if (selectedSource) cutSound(selectedSource, currentTime);
          }
      });
deleteButton === null || deleteButton === void 0
    ? void 0
    : deleteButton.addEventListener("click", deleteSource);
let isDeleting = false;
async function deleteSource() {
    var _a, _b;
    if (!isDeleting && currentSelectedSourceList.size <= 0) return;
    isDeleting = true;
    (_a = document.getElementById("option_modal")) === null || _a === void 0
        ? void 0
        : _a.remove();
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    clearRedoList();
    let trackNumber = 0;
    const currentTime = getCurrentPlayTime();
    (_b = document.getElementById("selected_bar")) === null || _b === void 0
        ? void 0
        : _b.remove();
    currentSelectedSourceList.forEach((source) => {
        var _a;
        (_a = document.getElementById(source.sourceKey)) === null ||
        _a === void 0
            ? void 0
            : _a.remove();
        sourceStore.delete(source.sourceKey);
        trackNumber = source.trackNumber;
    });
    setTrackSound(trackNumber);
    currentSelectedSourceList.clear();
    await adjustStartOffset(currentTime);
    isDeleting = false;
}
timeAddButton === null || timeAddButton === void 0
    ? void 0
    : timeAddButton.addEventListener("click", () => {
          maxPlayDuration += parseInt(timeInput.value);
          timeInput.value = "0";
          drawTrack();
          drawTimeLine();
      });
trackAddButton === null || trackAddButton === void 0
    ? void 0
    : trackAddButton.addEventListener("click", () => {
          clearRedoList();
          pushStore(undoSourceList, sourceStore);
          pushStore(undoTrackList, trackSourceStore);
          const newTrack = new TrackNode(++trackNumber, 0, 0);
          trackSourceStore.set(newTrack.trackKey, newTrack);
          setTrackSound(newTrack.trackNumber);
          createSoundbar(trackNumber);
          drawStick(getCurrentPlayTime());
      });
async function initPlayTime() {
    await adjustStartOffset(0);
    drawStick(0);
}
fileInput === null || fileInput === void 0
    ? void 0
    : fileInput.addEventListener("change", (event) => {
          event.stopPropagation();
          event.preventDefault();
          if (!audioCtx) audioCtx = new AudioContext({ sampleRate: 44100 });
          if (event.target instanceof HTMLInputElement) {
              const file = event.target.files ? event.target.files[0] : null;
              const fileReader = new FileReader();
              const fileName = file.name;
              if (file) fileReader.readAsArrayBuffer(file);
              fileReader.onload = async function () {
                  const arrayBuffer = fileReader.result;
                  if (arrayBuffer instanceof ArrayBuffer) {
                      const audioBuffer = await audioCtx.decodeAudioData(
                          arrayBuffer
                      ); // 이 메소드는 MP3와 WAV 확장자에만 가능하다는 듯 하다.
                      waveIndex++;
                      trackNumber++;
                      fileIndex++;
                      const originSource = new OriginSource(
                          fileIndex,
                          fileName,
                          audioBuffer
                      );
                      const sourceNode = new SourceNode(
                          waveIndex,
                          trackNumber,
                          originSource
                      );
                      sourceStore.set(sourceNode.sourceKey, sourceNode);
                      originSourceStore.set(originSource.fileKey, originSource);
                      setTrackSound(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기
                      // 파일 하나당 트랙 및 웨이브 추가
                      createSoundbar(trackNumber);
                      const wave = [createWaveBar(waveIndex, trackNumber)];
                      drawWave(wave, sourceNode.trackKey);
                      const currentPlayTime = getCurrentPlayTime();
                      drawStick(currentPlayTime);
                      createOriginFile(originSource);
                      // 첨부파일 초기화
                      fileInput.files = new DataTransfer().files;
                  }
              };
          }
      });
/**
 * Create Element Function
 */
function createOriginFile(originSource) {
    const fileShowerBox = document.createElement("div");
    fileShowerBox.id = originSource.fileKey;
    fileShowerBox.classList.add("file_shower_box");
    fileShowerBox.addEventListener("contextmenu", (event) => {
        showOriginOption(event, originSource.fileKey);
    });
    const imgShower = document.createElement("div");
    imgShower.classList.add("img_shower");
    imgShower.src = "audio/soundImg.png";
    const nameShower = document.createElement("div");
    nameShower.classList.add("name_shower");
    nameShower.innerText = originSource.fileName;
    fileShowerBox.appendChild(imgShower);
    fileShowerBox.appendChild(nameShower);
    fileListBox === null || fileListBox === void 0
        ? void 0
        : fileListBox.append(fileShowerBox);
}
function showOriginOption(event, fileKey) {
    const optionModal = document.createElement("div");
    const copyOrigin = document.createElement("div");
    const deleteOrigin = document.createElement("div");
    optionModal.id = "option_modal";
    optionModal.style.left = event.pageX + "px";
    optionModal.style.top = event.pageY - 10 + "px";
    // Delete Element
    copyOrigin.classList.add("option", "ind_option");
    copyOrigin.innerText = "원본 복사하기";
    copyOrigin.addEventListener("click", () => {
        var _a;
        (_a = document.getElementById("option_modal")) === null || _a === void 0
            ? void 0
            : _a.remove();
        currentCopiedSourceList.clear();
        const originSource = originSourceStore.get(fileKey);
        if (originSource) {
            const newSource = new SourceNode(++waveIndex, 0, originSource);
            currentCopiedSourceList.add(newSource);
        }
    });
    deleteOrigin.classList.add("option", "ind_option");
    deleteOrigin.innerText = "원본 삭제하기";
    deleteOrigin.addEventListener("click", () => {
        var _a, _b;
        (_a = document.getElementById("option_modal")) === null || _a === void 0
            ? void 0
            : _a.remove();
        (_b = document.getElementById(fileKey)) === null || _b === void 0
            ? void 0
            : _b.remove();
        originSourceStore.delete(fileKey);
    });
    optionModal.appendChild(copyOrigin);
    optionModal.appendChild(deleteOrigin);
    document.body.appendChild(optionModal);
}
function createSoundbar(trackNumber) {
    const trackKey = `track${trackNumber}`;
    const soundBox = document.createElement("div");
    soundBox.id = trackKey;
    soundBox.classList.add("sound_box");
    const waveBox = document.createElement("div");
    waveBox.classList.add("wave_box", trackKey);
    waveBox.addEventListener("contextmenu", showTrackOption);
    waveBox.addEventListener("mousedown", dragstart);
    const dragBox = document.createElement("div");
    dragBox.id = "drag_box";
    dragBox.dataset.trackKey = trackKey;
    const trackPlayButton = document.createElement("button");
    trackPlayButton.classList.add("track_play_button", trackKey); // trackKey는 나중에 querySelector로 trackPlayButton을 조회할 때 필요
    trackPlayButton.dataset.trackKey = trackKey;
    if (
        isTrackPlaying &&
        (currentTrackSound === null || currentTrackSound === void 0
            ? void 0
            : currentTrackSound.trackKey) === trackKey
    ) {
        trackPlayButton.innerText = "∥";
    } else {
        trackPlayButton.innerText = "▶";
    }
    trackPlayButton.addEventListener("click", () => {
        const track = currentTrackSoundStore.get(trackKey);
        if (track) {
            playTrackSound(track);
        }
    });
    trackOption === null || trackOption === void 0
        ? void 0
        : trackOption.appendChild(trackPlayButton);
    soundBox.appendChild(waveBox);
    waveBox.appendChild(dragBox);
    trackContainer === null || trackContainer === void 0
        ? void 0
        : trackContainer.appendChild(soundBox);
    drawTrack();
    drawTimeLine();
}
function createWaveBar(waveIndex, trackNumber) {
    const waveBar = document.createElement("canvas");
    const sourceKey = "source" + waveIndex;
    const trackKey = "track" + trackNumber;
    waveBar.id = sourceKey;
    waveBar.classList.add("wave_bar");
    waveBar.dataset.trackKey = trackKey;
    waveBar.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement) {
            const trackKey = event.target.dataset.trackKey;
            if (trackKey) {
                selectTrack(trackKey);
                selectWaveBar(event.target.id);
            }
        }
    });
    waveBar.addEventListener("contextmenu", showTrackOption);
    return waveBar;
}
function selectWaveBar(sourceKey) {
    var _a;
    (_a = document.getElementById("selected_bar")) === null || _a === void 0
        ? void 0
        : _a.remove;
    currentSelectedSourceList.clear();
    const source = sourceStore.get(sourceKey);
    if (source) {
        currentSelectedSourceList.add(source);
        selectedBarStart = source.startTime;
        selectedBarEnd = source.endTime;
        createSelectedBar(source.trackKey, source.sourceKey);
    }
}
function createSelectedBar(trackKey, sourceKey = "none") {
    var _a;
    (_a = document.getElementById("selected_bar")) === null || _a === void 0
        ? void 0
        : _a.remove();
    const waveBox = document.querySelector(`#${trackKey} .wave_box`);
    const selectedBar = document.createElement("div");
    selectedBar.addEventListener("contextmenu", showWaveOption);
    selectedBar.addEventListener("mousedown", dragInit);
    selectedBar.id = "selected_bar";
    selectedBar.dataset.trackKey = trackKey;
    selectedBar.dataset.sourceKey = sourceKey;
    selectedBar.style.width = `${
        (selectedBarEnd - selectedBarStart) * widthRatio
    }px`;
    selectedBar.style.left = `${selectedBarStart * widthRatio}px`;
    waveBox === null || waveBox === void 0
        ? void 0
        : waveBox.appendChild(selectedBar);
}
/**
 * Show Option Function
 */
function showWaveOption(event) {
    var _a;
    event.preventDefault();
    event.stopPropagation();
    (_a = document.getElementById("option_modal")) === null || _a === void 0
        ? void 0
        : _a.remove();
    let sourceKey = "none";
    if (event.target instanceof HTMLElement) {
        sourceKey = event.target.dataset.sourceKey;
    }
    const source = sourceStore.get(sourceKey);
    const optionModal = document.createElement("div");
    const copy = document.createElement("div");
    const sourcePaste = document.createElement("div");
    const sourceDelete = document.createElement("div");
    optionModal.id = "option_modal";
    optionModal.style.left = event.pageX + "px";
    optionModal.style.top = event.pageY - 10 + "px";
    // GainInput Element
    if (sourceKey !== "none" && source) {
        const wrapBox = document.createElement("div");
        const gainInput = document.createElement("input");
        wrapBox.classList.add("option", "ind_option");
        gainInput.classList.add("gain", "option");
        gainInput.setAttribute("type", "range");
        gainInput.setAttribute("min", "0");
        gainInput.setAttribute("max", "2");
        gainInput.setAttribute("step", "0.05");
        gainInput.setAttribute("value", String(source.gainValue));
        gainInput.addEventListener("change", async () => {
            source.setGainValue(parseFloat(gainInput.value));
            setTrackSound(source.trackNumber);
            await adjustStartOffset(getCurrentPlayTime());
            const waves = [document.getElementById(source.sourceKey)]; // drawWave가 waveBar배열을 인자로 받기 때문에 번거롭지만 이렇게 해야 함
            drawWave(waves, source.trackKey);
        });
        wrapBox.appendChild(gainInput);
        optionModal.appendChild(wrapBox);
    }
    // Copy Element
    copy.classList.add("option", "ind_option");
    copy.innerText = "복사하기";
    copy.addEventListener("click", () => {
        var _a;
        currentCopiedSourceList.clear();
        for (const source of currentSelectedSourceList.values()) {
            (_a = document.getElementById("option_modal")) === null ||
            _a === void 0
                ? void 0
                : _a.remove();
            currentCopiedSourceList.add(source);
        }
    });
    // Paste Element
    sourcePaste.classList.add("option", "ind_option");
    sourcePaste.innerText = "붙여넣기";
    sourcePaste.addEventListener("click", pasteSource);
    // Delete Element
    sourceDelete.classList.add("option", "ind_option");
    sourceDelete.innerText = "제거하기";
    sourceDelete.addEventListener("click", deleteSource);
    optionModal.appendChild(copy);
    optionModal.appendChild(sourcePaste);
    optionModal.appendChild(sourceDelete);
    document.body.appendChild(optionModal);
}
function showTrackOption(event) {
    var _a;
    event.preventDefault();
    event.stopPropagation();
    (_a = document.getElementById("option_modal")) === null || _a === void 0
        ? void 0
        : _a.remove();
    removeAllSelected();
    if (!(event.target instanceof HTMLElement)) return;
    const trackKey = event.target.dataset.trackKey;
    selectTrack(trackKey);
    const optionModal = document.createElement("div");
    const trackDelete = document.createElement("div");
    const sourcePaste = document.createElement("div");
    optionModal.id = "option_modal";
    optionModal.style.left = event.pageX + "px";
    optionModal.style.top = event.pageY - 10 + "px";
    // Delete Element
    trackDelete.classList.add("option", "ind_option");
    trackDelete.innerText = "트랙 지우기";
    trackDelete.addEventListener("click", () => {
        deleteTrack(trackKey);
    });
    // Paste Element
    sourcePaste.classList.add("option", "ind_option");
    sourcePaste.innerText = "붙여넣기";
    sourcePaste.addEventListener("click", pasteSource);
    optionModal.appendChild(trackDelete);
    optionModal.appendChild(sourcePaste);
    document.body.appendChild(optionModal);
}
/**
 * Doing Option Function
 */
async function deleteTrack(trackKey) {
    var _a, _b, _c;
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    (_a = document.getElementById("option_modal")) === null || _a === void 0
        ? void 0
        : _a.remove();
    (_b = document.getElementById(trackKey)) === null || _b === void 0
        ? void 0
        : _b.remove();
    (_c = document.querySelector(`#track_option .${trackKey}`)) === null ||
    _c === void 0
        ? void 0
        : _c.remove();
    trackSourceStore.delete(trackKey);
    currentTrackSoundStore.delete(trackKey);
    for (const source of sourceStore.values()) {
        if (source.trackKey === trackKey) {
            sourceStore.delete(source.sourceKey);
        }
    }
    const currentPlayTime = getCurrentPlayTime();
    if (isTrackPlaying && currentTrackSound) {
        if (trackKey === currentTrackSound.trackKey)
            await playTrackSound(currentTrackSound);
        else {
            await adjustStartOffset(currentPlayTime);
        }
    } else {
        if (trackSourceStore.size === 0) {
            await play();
        } // 트랙을 지우고 트랙이 모두 없어진 경우
        else {
            await adjustStartOffset(currentPlayTime);
        } // 트랙이 하나라도 남아 있는 경우
    }
    drawStick(currentPlayTime);
}
let isPasting = false;
async function pasteSource() {
    var _a;
    (_a = document.getElementById("option_modal")) === null || _a === void 0
        ? void 0
        : _a.remove();
    if (
        isPasting ||
        currentCopiedSourceList.size === 0 ||
        !currentSelectedTrack
    )
        return;
    isPasting = true;
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    const copiedSourceArray = [];
    const waves = [];
    const trackKey = currentSelectedTrack.id;
    const trackNumber = parseInt(trackKey.slice(5, 6));
    const currentPlayTime = getCurrentPlayTime();
    let plusTime = 0; // 복사한 소스들의 startTime을 재설정하기 위해 기존의 SourceNode의 startTime에 추가로 더할 값
    let startTime = currentPlayTime;
    let endTime = 0;
    currentCopiedSourceList.forEach((source) => {
        const copiedSource = copyToNewSourceNode(source);
        sourceStore.set(copiedSource.sourceKey, copiedSource);
        copiedSourceArray.push(copiedSource);
    });
    copiedSourceArray.sort(function (a, b) {
        return a.startTime - b.startTime;
    });
    plusTime = currentPlayTime - copiedSourceArray[0].startTime; // 정렬된 array의 첫 번째 sourceNode를 이용해 plusTime을 구함
    // 선택된 source가 있고 같은 트랙일 경우 경우 그 source의 endTime에 이어서 붙이도록 하기 위한 startTime 초기화 과정
    if (currentSelectedSourceList.size !== 0) {
        let tempStartTime = 0;
        for (const source of currentSelectedSourceList.values()) {
            tempStartTime = Math.max(source.endTime, tempStartTime);
        }
        plusTime = tempStartTime - copiedSourceArray[0].startTime; // 붙여지는 위치가 바뀌기 때문에 plusTime도 그 위치에 맞게 다시 계산됭어야 함
        startTime = tempStartTime;
    }
    removeAllSelected(); // coverSound()를 호출할 때 currentSelectedSourceList가 영향을 주기 때문에 초기화 과정을 거침
    // 복사한 source들의 위치를 조정하고 waveBar를 생성
    for (let i = 0; i < copiedSourceArray.length; i++) {
        const sourceNode = copiedSourceArray[i];
        sourceNode.setStartTime(sourceNode.startTime + plusTime);
        sourceNode.resetEndTime();
        sourceNode.resetTrackNumber(trackNumber);
        currentSelectedSourceList.add(sourceNode);
        endTime = Math.max(endTime, sourceNode.endTime);
        const waveBar = createWaveBar(sourceNode.index, sourceNode.trackNumber);
        waves.push(waveBar);
    }
    await coverSound(startTime, endTime, trackKey);
    setTrackSound(trackNumber);
    await adjustStartOffset(currentPlayTime);
    drawTrack();
    drawTimeLine();
    drawWave(waves, trackKey);
    // 복사된 source들이 선택되도록 만들기
    selectedBarStart = startTime;
    selectedBarEnd = endTime;
    copiedSourceArray.length === 1 // 복사한 Source가 하나일 경우 음량 조절이 가능하게 하기 위해 sourceKey을 인자로 보냄
        ? createSelectedBar(trackKey, copiedSourceArray[0].sourceKey)
        : createSelectedBar(trackKey);
    isPasting = false;
}
/**
 * Drag And Select Function
 */
function dragstart(event) {
    event.preventDefault();
    // event.stopPropagation();
    if (!(event.target instanceof HTMLElement)) return;
    if (event.button === 2 || event.target.id !== "drag_box") return;
    removeAllSelected();
    const trackKey = event.target.dataset.trackKey;
    const soundBox = document.getElementById(trackKey);
    selectTrack(trackKey);
    dragAreaStartX = event.offsetX;
    dragAreaStartY = event.offsetY;
    const dragArea = document.createElement("div");
    dragArea.id = "drag_area";
    dragArea.dataset.trackKey = trackKey;
    dragArea.style.left = `${dragAreaStartX}px`;
    dragArea.style.top = `${dragAreaStartY}px`;
    const dragSpace = document.createElement("div");
    dragSpace.id = "drag_space";
    dragSpace.dataset.trackKey = trackKey;
    dragSpace.style.zIndex = "99";
    dragSpace.style.width = trackWidth + "px";
    soundBox === null || soundBox === void 0
        ? void 0
        : soundBox.prepend(dragArea);
    soundBox === null || soundBox === void 0
        ? void 0
        : soundBox.prepend(dragSpace);
    document.addEventListener("mousemove", moveDragArea);
    dragSpace.addEventListener("mouseup", selectAreaElements);
    dragSpace.addEventListener("mouseleave", selectAreaElements);
}
function selectTrack(trackKey) {
    const soundBox = document.getElementById(trackKey);
    if (currentSelectedTrack) {
        currentSelectedTrack.classList.remove("selected");
    }
    if (soundBox) {
        soundBox.classList.add("selected");
    }
    currentSelectedTrack = soundBox;
}
function moveDragArea(event) {
    event.preventDefault();
    event.stopPropagation();
    const dragArea = document.getElementById("drag_area");
    const x = event.offsetX;
    const y = event.offsetY;
    //마우스 이동에 따라 선택 영역을 리사이징 한다
    const width = Math.max(x - dragAreaStartX, dragAreaStartX - x);
    const left = Math.min(dragAreaStartX, x);
    const height = Math.max(y - dragAreaStartY, dragAreaStartY - y);
    const top = Math.min(dragAreaStartY, y);
    if (dragArea instanceof HTMLElement) {
        dragArea.style.width = `${width}px`;
        dragArea.style.left = `${left}px`;
        dragArea.style.height = `${height}px`;
        dragArea.style.top = `${top}px`;
    }
}
function selectAreaElements(event) {
    const dragArea = document.getElementById("drag_area");
    if (dragArea instanceof HTMLElement) {
        const trackKey =
            dragArea === null || dragArea === void 0
                ? void 0
                : dragArea.dataset.trackKey;
        const dragWidth = parseFloat(dragArea.style.width)
            ? parseFloat(dragArea.style.width)
            : 0;
        const areaStart = parseFloat(dragArea.style.left); // 드래그 영역의 맨 왼쪽 지점
        const areaEnd = areaStart + dragWidth; // 드래그 영역의 맨 오른쪽 지점
        removeAllDragAreaEvent();
        let tempStart = 999999;
        let tempEnd = 0;
        for (const source of sourceStore.values()) {
            //같은 트랙에 있는 source에 대해서만 수행
            if (source.trackKey === trackKey) {
                const sourceStart = source.startTime * widthRatio; // source의 waveBar left값
                const sourceEnd = source.endTime * widthRatio; // source의 끝 위치
                // 드래그 영역에 포함되는 source를 추가
                if (!(sourceStart > areaEnd || sourceEnd < areaStart)) {
                    currentSelectedSourceList.add(source);
                    tempStart = Math.min(tempStart, source.startTime);
                    tempEnd = Math.max(tempEnd, source.endTime);
                }
            }
        }
        if (!(currentSelectedSourceList.size === 0)) {
            selectedBarStart = tempStart;
            selectedBarEnd = tempEnd;
            if (currentSelectedSourceList.size === 1) {
                // 드래그 된 값이 하나일 경우 사운드 조절이 가능하게 하기 위한 작업
                currentSelectedSourceList.forEach((source) =>
                    createSelectedBar(trackKey, source.sourceKey)
                );
            } else {
                createSelectedBar(trackKey);
            }
        }
    }
}
function removeAllDragAreaEvent() {
    var _a, _b;
    document.removeEventListener("mousemove", moveDragArea);
    (_a = document.getElementById("drag_space")) === null || _a === void 0
        ? void 0
        : _a.remove();
    (_b = document.getElementById("drag_area")) === null || _b === void 0
        ? void 0
        : _b.remove();
}
/**
 * Move WaveBar Function
 */
function dragInit(event) {
    event.preventDefault();
    if (event.button === 2) return;
    document.addEventListener("mousemove", moveSelectedBar);
    document.addEventListener("mouseup", moveWaveBar);
    dragStartX = event.clientX;
    previousDragX = event.clientX;
    const selectedBar = document.getElementById("selected_bar");
    dragStartSelectedBarLeft = parseFloat(selectedBar.style.left);
    if (event.target instanceof HTMLElement) {
        const trackKey = event.target.dataset.trackKey;
        const dragBoxes = document.querySelectorAll("#drag_box");
        dragBoxes.forEach((dragBox) => {
            if (
                dragBox instanceof HTMLElement &&
                dragBox.dataset.trackKey !== trackKey
            ) {
                dragBox.style.zIndex = "3";
                dragBox.addEventListener("mouseenter", moveToAnotherTrack);
            }
        });
    }
}
function moveSelectedBar(event) {
    event.preventDefault();
    const selectedBar = document.getElementById("selected_bar");
    const trackKey = selectedBar.dataset.trackKey;
    const sourceKeyList = new Set();
    const selectedBarWidth = parseFloat(selectedBar.style.width);
    const selectedBarLeft = parseFloat(selectedBar.style.left);
    const movedX = previousDragX - event.clientX; // 움직인 거리
    let stickLeft = false; // 다른 waveBar의 양 끝 지점에 가까워 붙이는 지
    let stickLeftOffset = 0;
    currentSelectedSourceList.forEach((source) => {
        sourceKeyList.add(source.sourceKey);
    });
    const newLeft = selectedBarLeft - movedX; //고정될 위치이자 startTime의 시작 지점
    const endTimeOffset = newLeft + selectedBarWidth; //끝나는 지점
    // 다른 waveBar의 양 끝 지점에 가까울 경우 붙이도록 하는 로직
    for (const source of sourceStore.values()) {
        if (
            source.trackKey === trackKey &&
            !sourceKeyList.has(source.sourceKey)
        ) {
            // 같은 트랙이면서 선택된 sound가 아닌 것
            const waveBar = document.getElementById(source.sourceKey);
            const waveBarStart = parseFloat(waveBar.style.left);
            const waveBarEnd =
                parseFloat(waveBar.style.left) +
                parseFloat(waveBar.style.width);
            if (Math.abs(waveBarStart - endTimeOffset) < 15) {
                stickLeft = true;
                stickLeftOffset = waveBarStart - selectedBarWidth;
            } else if (Math.abs(waveBarEnd - newLeft) < 15) {
                stickLeft = true;
                stickLeftOffset = waveBarEnd;
            }
        }
    }
    if (newLeft < 0) selectedBar.style.left = "0px";
    else if (newLeft + selectedBarWidth >= trackWidth)
        selectedBar.style.left = `${trackWidth - selectedBarWidth}px`;
    else if (stickLeft) {
        selectedBar.style.left = `${stickLeftOffset}px`;
    } else selectedBar.style.left = `${newLeft}px`;
    if (!stickLeft) previousDragX = event.clientX;
}
function moveToAnotherTrack(event) {
    if (event.target !== this) {
        return;
    }
    removeDragBoxEvent();
    const trackKey = event.target.dataset.trackKey; // dragBox(event.target)의 클래스 중 trackKey부분 추출
    const selectedBar = document.getElementById("selected_bar");
    const waveBox = document.querySelector("#" + trackKey + " .wave_box");
    if (selectedBar) {
        waveBox === null || waveBox === void 0
            ? void 0
            : waveBox.appendChild(selectedBar);
        selectedBar.dataset.trackKey = trackKey;
    }
    const dragBoxes = document.querySelectorAll("#drag_box");
    dragBoxes.forEach((dragBox) => {
        if (
            dragBox instanceof HTMLElement &&
            dragBox.dataset.trackKey !== trackKey
        ) {
            dragBox.style.zIndex = "3";
            dragBox.addEventListener("mouseenter", moveToAnotherTrack);
        }
    });
}
async function moveWaveBar() {
    removeDragBoxEvent();
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    clearRedoList();
    document.removeEventListener("mousemove", moveSelectedBar);
    document.removeEventListener("mouseup", moveWaveBar);
    const selectedBar = document.getElementById("selected_bar");
    const trackKey = selectedBar.dataset.trackKey;
    const waveBox = document.querySelector(`#${trackKey} .wave_box`);
    const trackNumber = parseInt(trackKey.slice(5, 6));
    const currentTime = getCurrentPlayTime();
    const selectedBarLeft = parseFloat(selectedBar.style.left);
    const selectedBarWidth = parseFloat(selectedBar.style.width);
    const moveAmount = selectedBarLeft - dragStartSelectedBarLeft; // 이동해야 하는 거리
    const moveTime = moveAmount / widthRatio; // 이동해야 하는 시간
    selectTrack(trackKey);
    currentSelectedSourceList.forEach((source) => {
        const waveBar = document.getElementById(source.sourceKey);
        const startTime =
            source.startTime + moveTime > 0 ? source.startTime + moveTime : 0;
        waveBar.style.left = parseFloat(waveBar.style.left) + moveAmount + "px"; // 기존의 left에 움직인 거리만큼 더함
        waveBar.dataset.trackKey = trackKey;
        source.setStartTime(startTime);
        source.resetEndTime();
        source.resetTrackNumber(trackNumber);
        waveBox === null || waveBox === void 0
            ? void 0
            : waveBox.appendChild(waveBar);
    });
    const minStartTime = selectedBarLeft / widthRatio;
    const maxEndTime = (selectedBarWidth + selectedBarLeft) / widthRatio;
    await coverSound(minStartTime, maxEndTime, trackKey);
    for (const track of trackSourceStore.values()) {
        setTrackSound(track.trackNumber);
    }
    await adjustStartOffset(currentTime);
}
/**
 * 주어진 minStartTime과 maxEndTime으로 붙여넣기되는 Source를 기준으로
 * 사라지거나 cut되어야 할 Source들을 구하고 수행하는 메소드
 */
async function coverSound(minStartTime, maxEndTime, trackKey) {
    const trackSources = []; // 현재 트랙의 모든 소스들
    const middleSources = []; // 완전히 사라져버릴 애들
    let biggerSource = null; // 더 커서 쪼개질 애
    let leftSource = null; // 잘려서 왼쪽에 남을 애
    let rightSource = null; // 잘려서 오른쪽에 남을 애
    for (const source of sourceStore.values()) {
        // 현재 선택된 source들을 제외한 모든 source
        if (
            !currentSelectedSourceList.has(source) &&
            source.trackKey === trackKey
        ) {
            trackSources.push(source);
        }
    }
    // 덮어 씌우려는 sound를 기준으로 덮어씌워지는 sound들이 있는 지 확인 후 있다면 저장
    for (const source of trackSources) {
        if (minStartTime > source.startTime && maxEndTime < source.endTime) {
            biggerSource = source;
            break;
        } else if (
            minStartTime > source.startTime &&
            minStartTime < source.endTime &&
            maxEndTime >= source.endTime
        ) {
            leftSource = source;
        } else if (
            minStartTime <= source.startTime &&
            maxEndTime >= source.startTime &&
            maxEndTime < source.endTime
        ) {
            rightSource = source;
        } else if (
            minStartTime <= source.startTime &&
            maxEndTime >= source.endTime
        ) {
            middleSources.push(source);
        }
    }
    if (biggerSource) {
        await coverSource(biggerSource, minStartTime, maxEndTime);
    } else {
        /**
         * 여기서 cutSound 메소드를 호출하는 경우는 setTrackSound를 호출할 필요가 없다.
         * 근데 이걸 cutSound 메소드 하나에서 해결하는 것 보다 left와 right를 삭제하는 새로운 메소드 두 개를 만드는 게 나을 것 같다.
         */
        if (leftSource)
            await cutSound(leftSource, minStartTime, false, true, false);
        if (rightSource)
            await cutSound(rightSource, maxEndTime, true, false, false);
        if (middleSources)
            middleSources.forEach((source) => {
                var _a;
                sourceStore.delete(source.sourceKey);
                (_a = document.getElementById(source.sourceKey)) === null ||
                _a === void 0
                    ? void 0
                    : _a.remove();
            });
    }
}
function removeDragBoxEvent() {
    const dragBoxes = document.querySelectorAll("#drag_box");
    dragBoxes.forEach((dragBox) => {
        if (dragBox instanceof HTMLElement) {
            dragBox.style.zIndex = "0";
            dragBox.removeEventListener("mouseenter", moveToAnotherTrack);
        }
    });
}
/**
 * Drawing Function
 */
function drawTrack() {
    const soundBoxList = document.querySelectorAll(".sound_box");
    const waveBoxList = document.querySelectorAll(".wave_box");
    const dragBoxList = document.querySelectorAll("#drag_box");
    setTrackWidth();
    soundBoxList.forEach((target) => {
        target.style.width = trackWidth + "px";
    });
    waveBoxList.forEach((target) => {
        target.style.width = trackWidth + "px";
    });
    dragBoxList.forEach((target) => {
        target.style.width = trackWidth + "px";
    });
}
function setTrackWidth() {
    let playDuration = 0;
    for (const trackSound of trackSourceStore.values()) {
        if (trackSound) {
            playDuration = Math.max(
                playDuration,
                calculateTotalDuration(trackSound.trackNumber)
            );
        }
    }
    maxPlayDuration = Math.max(maxPlayDuration, playDuration);
    trackWidth = maxPlayDuration * widthRatio;
}
function drawAllWave(needWave = true) {
    const waves = document.querySelectorAll(".wave_bar");
    for (const wave of waves) {
        const element = wave;
        const source = sourceStore.get(wave.id);
        if (source) {
            element.width = source.duration * widthRatio;
            element.style.left = source.startTime * widthRatio + "px"; // 시작 지점
            element.style.width = source.duration * widthRatio + "px"; // border크기 때문에 2px 뺌
            if (needWave) createWave(source.sourceKey);
        }
    }
}
function drawWave(waves, trackKey) {
    const waveBox = document.getElementById(trackKey);
    for (const wave of waves) {
        const source = sourceStore.get(wave.id);
        if (source) {
            wave.width = source.duration * widthRatio;
            wave.style.left = source.startTime * widthRatio + "px"; // 시작 지점
            wave.style.width = source.duration * widthRatio + "px"; // border크기 때문에 2px 뺌
            waveBox === null || waveBox === void 0
                ? void 0
                : waveBox.appendChild(wave);
            createWave(source.sourceKey);
        }
    }
}

function createWave(sourceKey) {
    const source = sourceStore.get(sourceKey);
    const wave = document.getElementById(sourceKey);
    const samplesPerSec = 30; // 초당 표시할 샘플의 수 (즉, 1초에 보여지는 변화의 수)
    const rawData = source.getAudioBuffer().getChannelData(0); // 첫번쨰 채널의 AudioBuffer
    const totalSamples = source.duration * samplesPerSec; // 구간 처리 후 전체 샘플 수
    const blockSize = Math.floor(sampleRate / samplesPerSec); // 샘플링 구간 사이즈
    const filteredData = [];
    /**
     * 결국 샘플링이라는 것은 모든 rawData를 순회해야 한다.
     * 예를 들어 초당 30개의 샘플을 추출한다고 하면 sampleRate(보통 44100Hz)를 30으로 나눈 값이 블록 사이즈가 되고
     * 해당 블록 사이즈 동안의 rawData를 추출하고 그 값의 평균을 구하게 된다.
     * 그 평균 값은 1초를 30으로 나눈 0.33 .. 초 마다 wave로 표시되는 것이다.
     * 따라서 samplePerSec의 크기를 크게 잡아 줄 수록 1초에 보여지는 변화가 많아진다.
     * samplePerSec와 for문에서 반복되는 회수와는 아무 상관이 없다.
     * 초당 추출할 샘플평균의 회수이므로 wave의 변화를 몇 번 주는 지에 해당한다고 볼 수 있다.
     * */
    for (let i = 0; i < totalSamples; i++) {
        const blockStart = blockSize * i; // 샘플 구간 시작 포인트
        let blockSum = 0;
        for (let j = 0; j < blockSize; j += 100) {
            if (rawData[blockStart + j]) {
                blockSum = blockSum + Math.abs(rawData[blockStart + j]);
            }
        }
        filteredData.push((blockSum / blockSize) * 70); // 구간 평균치를 결과 배열에 추가
    }
    const ctx = wave.getContext("2d");
    // const dpr = window.devicePixelRatio || 1;
    const canvasHeight = wave.height;
    const canvasWidth = wave.width;
    if (ctx) {
        // ctx.scale(dpr, dpr);
        // ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // 샘플 1개가 차지할 넓이
        const sampleWidth = canvasWidth / filteredData.length;
        let lastX = 0; // x축 좌표
        ctx.beginPath(); // 선을 그리기 위해 새로운 경로를 만든다.
        ctx.moveTo(lastX, canvasHeight);
        ctx.strokeStyle = "rgb(102, 156, 192)"; // 라인 컬러 설정
        ctx.fillStyle = "rgb(102, 156, 192)"; // 그래프 내부를 채울 컬러 설정
        ctx.lineWidth = 2; // 라인 그래프의 두께
        filteredData.forEach((sample, index) => {
            const x = sampleWidth * index; // x 좌표
            ctx.lineTo(
                Math.floor(x),
                canvasHeight -
                    Math.floor(sample * canvasHeight * source.gainValue)
            );
            lastX = x;
        });
        // 라인 그래프의 하단을 선으로 연결해서 닫힌 형태로 만든 후, 색을 채운다
        ctx.lineTo(lastX, canvasHeight);
        ctx.moveTo(0, 0);
        ctx.stroke();
        ctx.fill();
        ctx.closePath(); // 그래프가 완성되었으므로 경로를 닫는다.
    }
}
function drawSelectedBar(beforeWidthRatio) {
    const selectedBar = document.getElementById("selected_bar");
    if (selectedBar) {
        const selectedBarDuration =
            parseFloat(selectedBar.style.width) / beforeWidthRatio;
        const selectedBarLeft =
            parseFloat(selectedBar.style.left) / beforeWidthRatio;
        selectedBar.style.width = `${selectedBarDuration * widthRatio}px`;
        selectedBar.style.left = `${selectedBarLeft * widthRatio}px`;
    }
}
function drawTimeLine() {
    // 지우고 다시 그리기 위한 작업
    const timeLabels = document.querySelectorAll(".time_label");
    const stickLabels = document.querySelectorAll(".stick_label");
    timeLabels.forEach((label) => label.remove());
    stickLabels.forEach((label) => label.remove());
    let per = 8; // 몇 초 단위로 라벨을 붙일 것인 지 (기본 = 10초)
    const playTime = trackWidth / widthRatio;
    if (widthRatio >= 50) {
        per = 1;
    } else if (widthRatio >= 34) {
        // widthRatio가 커지면 timeLine의 width가 늘어남에 따라 초당 찍을 수 있는 시간도 늘어남
        per = 2;
    } else if (widthRatio >= 18) {
        per = 4;
    }
    const perMini = per / 2; // 미니 라벨 붙이는 간격
    for (let i = 0; i < playTime; i++) {
        if (i % per === 0) {
            const second = String(i % 60).padStart(2, "0"); // 두 자리수 표현
            const minute = String(Math.floor(i / 60)).padStart(2, "0"); // 두 자리수 표현
            const timeLeft = widthRatio * i - 12; //  00:00 기준으로 00부분이 아닌 ':' 부분에 0초가 위치할 수 있게 12px만큼 뺌
            const timeLabel = document.createElement("label");
            timeLabel.classList.add("time_label");
            timeLabel.style.left = timeLeft + "px";
            timeLabel.innerText = minute + ":" + second;
            const stickLabel = document.createElement("label");
            const stickLeft = widthRatio * i;
            stickLabel.classList.add("stick_label");
            stickLabel.style.left = stickLeft + "px";
            stickLabel.style.bottom = "0";
            stickLabel.innerText = "|";
            timeLine === null || timeLine === void 0
                ? void 0
                : timeLine.appendChild(timeLabel);
            timeLine === null || timeLine === void 0
                ? void 0
                : timeLine.appendChild(stickLabel);
        } else if (i % perMini === 0) {
            const label = document.createElement("label");
            const left = widthRatio * i;
            label.classList.add("stick_label");
            label.style.left = left + "px";
            label.style.bottom = "0";
            label.innerText = "|";
            timeLine === null || timeLine === void 0
                ? void 0
                : timeLine.appendChild(label);
        }
    }
    if (timeLineBox) timeLineBox.style.width = trackWidth + "px";
    if (timeLine) timeLine.style.width = trackWidth + "px";
}
function drawStick(currentPlayTime) {
    // 지우고 다시 그리기 위한 작업
    const oldStick = document.getElementById("time_stick");
    const newStick = document.createElement("div");
    if (oldStick) {
        oldStick.remove();
    }
    if (currentPlayTime) {
        newStick.style.left =
            currentPlayTime * widthRatio + stickStartOffset + "px";
    } else {
        newStick.style.left = stickStartOffset + "px";
    }
    newStick.id = "time_stick";
    const timeLineHeight = parseInt(
        getComputedStyle(timeLine).getPropertyValue("height")
    );
    const tracksHeight = trackSourceStore.size * 97;
    const borderHeight = trackSourceStore.size * 3; // border 길이만큼 더 더함
    newStick.style.height = timeLineHeight + tracksHeight + borderHeight + "px";
    trackContainer === null || trackContainer === void 0
        ? void 0
        : trackContainer.prepend(newStick);
    timeStick = newStick;
}
async function moveStick() {
    if (timeStick) {
        const currentStickLeft = timeStick.style.left
            ? parseFloat(timeStick.style.left)
            : stickStartOffset;
        timeStick.style.left = currentStickLeft + widthRatio / 20 + "px"; // 인터벌을 0.05초 단위로 설정하면, 0.05초당 초당 픽셀(widthRatio)을 20으로 나눈 값만큼 이동
        if (currentStickLeft - stickStartOffset >= trackWidth) {
            // 스틱이 트랙의 길이 보다 넘어가면 재생이 끝난 것으로 간주하고 처음으로 돌아감
            clearInterval(timeStickInterval);
            timeStick.style.left = stickStartOffset + "px";
            await initPlayTime(); // Start Offset 초기화
            const trackSound = currentTrackSound
                ? currentTrackSoundStore.get(currentTrackSound.trackKey)
                : null;
            isTrackPlaying && trackSound
                ? await playTrackSound(trackSound)
                : await play();
        }
    }
}
function setTrackSound(trackNumber) {
    const newTrackNode = new TrackNode(trackNumber, 0, 0);
    const newTrackSound = new TrackSound(trackNumber, null);
    currentTrackSoundStore.set(newTrackSound.trackKey, newTrackSound);
    trackSourceStore.set(newTrackNode.trackKey, newTrackNode);
    currentCombinedBuffer = null; // 전체 플레이 audioBuffer는 Track의 사운드가 변경될 경우 함께 초기화 해야 함
}
/**
 * Sound Play Function
 */
async function play(isAdjust = false) {
    if (isPlaying) {
        endTime = new Date().getTime();
        currentCombinedSource.stop();
        clearInterval(timeStickInterval);
        startOffset += (endTime - startTime) / 1000;
        isPlaying = false;
        changePlayPause(false, null, isAdjust);
    } else {
        if (isTrackPlaying && currentTrackSound) {
            // 이미 플레이중인 개별 트랙이 있을 경우 멈춤
            const trackSound = currentTrackSoundStore.get(
                currentTrackSound.trackKey
            );
            if (trackSound) await playTrackSound(trackSound);
        }
        const source = audioCtx.createBufferSource();
        if (!currentCombinedBuffer)
            currentCombinedBuffer = await getAllTrackMergedBuffer();
        source.buffer = currentCombinedBuffer;
        source.connect(audioCtx.destination);
        source.start(0, startOffset);
        startTime = new Date().getTime();
        currentCombinedSource = source;
        clearInterval(timeStickInterval);
        timeStickInterval = setInterval(() => {
            moveStick();
        }, 50);
        isPlaying = true;
        changePlayPause(true, null, isAdjust);
    }
}
async function playTrackSound(selectedTrackSound, isAdjust = false) {
    if (isTrackPlaying && currentTrackSound) {
        // 이미 플레이중인 경우
        endTime = new Date().getTime();
        currentTrackAudioSource.stop();
        clearInterval(timeStickInterval);
        startOffset += (endTime - startTime) / 1000;
        isTrackPlaying = false;
        changePlayPause(false, currentTrackSound.trackKey, isAdjust);
        if (currentTrackSound.trackKey !== selectedTrackSound.trackKey) {
            // 특정 트랙이 실행 중일 때 다른 트랙 실행 버튼을 누른 경우
            await playTrackSound(selectedTrackSound); // 다른 트랙을 클릭한 경우에는 기존의 사운드를 멈추고 새로운 트랙 실행
        }
    } else {
        if (isPlaying) {
            // 이미 통합 사운드가 실행 중일 경우
            play();
        }
        const source = audioCtx.createBufferSource();
        // trackSound에 저장된 audioBuffer가 있으면 그걸 씀. 없으면 새로 merge하고 trackSound에 저장
        if (!selectedTrackSound.audioBuffer)
            selectedTrackSound.audioBuffer = await mergeTrackSources(
                selectedTrackSound.trackNumber
            );
        source.buffer = selectedTrackSound.audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0, startOffset);
        startTime = new Date().getTime();
        currentTrackAudioSource = source;
        clearInterval(timeStickInterval); // 이전에 있던 interval이 있을 수 있으므로 지움 ( 겹치면 timeStick의 이동 속도가 빨라져 버림)
        timeStickInterval = setInterval(() => {
            moveStick();
        }, 50);
        currentTrackSound = selectedTrackSound; // 현재 재생 중인 source를 전역변수로 저장
        isTrackPlaying = true;
        changePlayPause(true, selectedTrackSound.trackKey, isAdjust);
    }
}
function changePlayPause(toPlay, trackKey, isAdjust = false) {
    if (isAdjust) {
        return;
    } // startOffset을 클릭해서 조정할 때에는 무시
    if (trackKey) {
        const trackPlayButton = document.querySelector(
            `#track_option .${trackKey}`
        );
        if (!(trackPlayButton instanceof HTMLElement)) return;
        toPlay
            ? (trackPlayButton.innerText = "∥")
            : (trackPlayButton.innerText = "▶");
    } else {
        toPlay ? (playButton.innerText = "∥") : (playButton.innerText = "▶");
    }
}
async function clickStartOffset(event) {
    const currentTime = getClickedTime(event);
    if (currentTime <= 0) {
        return;
    } // 클릭을 너무 빨리해서 offset에 문제가 생기는 경우가 있는데 그걸 방지
    await adjustStartOffset(currentTime);
    drawStick(currentTime);
}
function getClickedTime(event) {
    let element = event.target;
    let rect = element.getBoundingClientRect();
    let clickOffset = event.clientX - rect.left + element.scrollLeft;
    let offsetPercent = (clickOffset / element.offsetWidth) * 100;
    /** 전체 width에서 클릭 지점이 차지하는 비율을 구하고 전체 width와 곱하면 클릭한 지점까지의 길이가 됨. 거기에 초당 width 비율을 곱해서 길이에 대한 초를 구함. */
    return (trackWidth * (offsetPercent / 100)) / widthRatio;
}
/**
 * 현재 플레이 중인 상태를 파악하여 startOffset을 재설정하는 보조 메소드
 * isTrackPlaying이 true인 경우 : track사운드를 한 번 정지하고 startOffset을 currentPlayTime으로 설정한 후 재시작
 * isPlaying인 경우 : 모든 track이 합쳐진 merged sound를 한 번 정지하고 startOffset을 currentPlayTime으로 설정한 후 재시작
 * 그 외 : startOffset을 currentPlayTime으로 설정
 */
async function adjustStartOffset(currentPlayTime) {
    if (isTrackPlaying && currentTrackSound) {
        const trackSound = currentTrackSoundStore.get(
            currentTrackSound.trackKey
        );
        if (trackSound) {
            await playTrackSound(trackSound, true); // playTrackSound()를 수행하기 위해서는 Track에 대한 sourceNode 객체가 필요
            startOffset = currentPlayTime;
            await playTrackSound(trackSound, true); // playTrackSound()를 수행하기 위해서는 Track에 대한 sourceNode 객체가 필요
        }
    } else if (isPlaying) {
        await play(true); // 한 번 재생을 멈춤
        startOffset = currentPlayTime;
        await play(true); // offset을 0으로 설정 후 다시 재생
    } else {
        startOffset = currentPlayTime;
    }
}
async function getAllTrackMergedBuffer() {
    let maxDuration = 0;
    for (const track of trackSourceStore.values()) {
        maxDuration = Math.max(
            maxDuration,
            calculateTotalDuration(track.trackNumber)
        );
    }
    // for (const trackNode of trackSourceStore.values()) { // maxLength를 구함
    //     if(trackNode) { maxLength = Math.max(maxLength, trackNode.length); }
    // }
    return maxDuration === 0
        ? null
        : await mergeSources(maxDuration * sampleRate, sourceStore.values());
}
/**
 * Merge all sources of track of passed number and create new SourceNode object to reset trackSourceStore's value
 * */
async function mergeTrackSources(trackNumber) {
    const trackSourceList = [];
    for (const source of sourceStore.values()) {
        // track에 해당하는 source들을 골라 따로 배열을 만들어 둠
        if (source.trackNumber === trackNumber) {
            trackSourceList.push(source);
        }
    }
    const maxLength = calculateTotalDuration(trackNumber) * sampleRate; // length 는 duration에 sampleRate를 곱한 값과 일치함
    const mergedBuffer =
        maxLength <= 0 ? null : await mergeSources(maxLength, trackSourceList);
    const length = mergedBuffer ? mergedBuffer.length : 0;
    const duration = mergedBuffer ? mergedBuffer.duration : 0;
    const newTrackNode = new TrackNode(trackNumber, length, duration);
    trackSourceStore.set(newTrackNode.trackKey, newTrackNode);
    return mergedBuffer;
}
function calculateTotalDuration(trackNumber) {
    let maxDuration = 0;
    let totalSilenceTime = 0;
    const trackSourceList = [];
    for (const source of sourceStore.values()) {
        // track에 해당하는 source들을 골라 따로 배열을 만들어 둠
        if (source.trackNumber === trackNumber) {
            trackSourceList.push(source);
            maxDuration += source.duration; // 사운드들의 length를 다 더함
        }
    }
    // maxLength에 silence의 length를 추가하여 최종 length 계산하기
    trackSourceList.sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < trackSourceList.length; i++) {
        const silenceStartTime = trackSourceList[i - 1]
            ? trackSourceList[i - 1].endTime
            : 0;
        const silenceEndTime = trackSourceList[i].startTime;
        totalSilenceTime += silenceEndTime - silenceStartTime;
    }
    maxDuration += totalSilenceTime;
    return maxDuration;
}
async function mergeSources(maxLength, sources) {
    const offlineCtx = new OfflineAudioContext(
        numberOfChannels,
        maxLength,
        sampleRate
    );
    for (const node of sources) {
        if (node) {
            const source = offlineCtx.createBufferSource();
            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = node.gainValue;
            source.buffer = node.getAudioBuffer();
            source.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            source.start(node.startTime); // The information of function "start()" : Schedules(예약하다) playback of the audio data contained in the buffer, or begins playback immediately. Additionally allows the start offset and play duration to be set.
        }
    }
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
}
/**
 * Cutting Sound Function
 */
async function cutSound(
    sourceNode,
    cutTime,
    leftRemove = false,
    rightRemove = false,
    needSet = true
) {
    var _a, _b;
    const waves = [];
    const originAudioBuffer = sourceNode.getAudioBuffer();
    const cutFrame = (cutTime - sourceNode.startTime) * sampleRate;
    let leftSourceNode = null;
    let rightSourceNode = null;
    // 자르는 구간이 양끝과 딱 일치하는 경우 cutFrame이 0이 되거나  자를 게 없는 경우가 생김. 그런 경우를 방지.
    if (
        cutFrame <= 0 ||
        originAudioBuffer.getChannelData(0).length - cutFrame < 1
    )
        return;
    // 기존의 waveBar 및 selectedBar 지우기
    if (needSet) {
        // 작업을 수행하기 전에 undo list에 추가
        pushStore(undoSourceList, sourceStore);
        pushStore(undoTrackList, trackSourceStore);
        clearRedoList();
        (_a = document.getElementById("selected_bar")) === null || _a === void 0
            ? void 0
            : _a.remove(); // cover를 통해 cutSound가 이루어지는 경우 selected bar를 유지
    }
    (_b = document.getElementById(sourceNode.sourceKey)) === null ||
    _b === void 0
        ? void 0
        : _b.remove();
    sourceStore.delete(sourceNode.sourceKey);
    if (!leftRemove) {
        const duration = cutTime - sourceNode.startTime;
        leftSourceNode = new SourceNode(
            ++waveIndex,
            sourceNode.trackNumber,
            sourceNode.originSource
        );
        leftSourceNode.setDuration(duration);
        leftSourceNode.setStartTime(sourceNode.startTime);
        leftSourceNode.resetEndTime();
        leftSourceNode.setGainValue(sourceNode.gainValue);
        leftSourceNode.resetFrame(sourceNode.startFrame);
        sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);
        waves.push(
            createWaveBar(leftSourceNode.index, leftSourceNode.trackNumber)
        );
    }
    if (!rightRemove) {
        const duration = sourceNode.endTime - cutTime;
        rightSourceNode = new SourceNode(
            ++waveIndex,
            sourceNode.trackNumber,
            sourceNode.originSource
        );
        rightSourceNode.setDuration(duration);
        rightSourceNode.setStartTime(cutTime);
        rightSourceNode.resetEndTime();
        rightSourceNode.setGainValue(sourceNode.gainValue);
        rightSourceNode.resetFrame(sourceNode.startFrame + cutFrame);
        sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);
        waves.push(
            createWaveBar(rightSourceNode.index, rightSourceNode.trackNumber)
        );
    }
    if (needSet) {
        removeAllSelected();
        setTrackSound(sourceNode.trackNumber);
    }
    drawWave(waves, sourceNode.trackKey);
}
async function coverSource(sourceNode, firstCutTime, secondCutTime) {
    var _a;
    const waveBox = document.querySelector(`#${sourceNode.trackKey} .wave_box`);
    const rightStartCutFrame =
        (secondCutTime - sourceNode.startTime) * sampleRate;
    let leftSourceNode = null;
    let rightSourceNode = null;
    // 기존의 waveBar 지우기
    (_a = document.getElementById(sourceNode.sourceKey)) === null ||
    _a === void 0
        ? void 0
        : _a.remove();
    sourceStore.delete(sourceNode.sourceKey);
    for (let i = 0; i < 2; i++) {
        switch (i) {
            case 0: {
                const duration = firstCutTime - sourceNode.startTime;
                leftSourceNode = new SourceNode(
                    ++waveIndex,
                    sourceNode.trackNumber,
                    sourceNode.originSource
                );
                leftSourceNode.setDuration(duration);
                leftSourceNode.setStartTime(sourceNode.startTime);
                leftSourceNode.resetEndTime();
                leftSourceNode.setGainValue(sourceNode.gainValue);
                leftSourceNode.resetFrame(sourceNode.startFrame);
                sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);
                const leftWave = createWaveBar(
                    leftSourceNode.index,
                    leftSourceNode.trackNumber
                );
                waveBox === null || waveBox === void 0
                    ? void 0
                    : waveBox.appendChild(leftWave);
                break;
            }
            case 1: {
                const duration = sourceNode.endTime - secondCutTime;
                rightSourceNode = new SourceNode(
                    ++waveIndex,
                    sourceNode.trackNumber,
                    sourceNode.originSource
                );
                rightSourceNode.setDuration(duration);
                rightSourceNode.setStartTime(secondCutTime);
                rightSourceNode.resetEndTime();
                rightSourceNode.setGainValue(sourceNode.gainValue);
                rightSourceNode.resetFrame(
                    sourceNode.startFrame + rightStartCutFrame
                );
                sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);
                const rightWave = createWaveBar(
                    rightSourceNode.index,
                    rightSourceNode.trackNumber
                );
                waveBox === null || waveBox === void 0
                    ? void 0
                    : waveBox.appendChild(rightWave);
                break;
            }
        }
    }
    drawAllWave();
}
function separateSound(originAudioBuffer, startFrame, endFrame) {
    const mono = originAudioBuffer
        .getChannelData(0)
        .slice(startFrame, endFrame);
    const stereo =
        originAudioBuffer.numberOfChannels >= 2
            ? originAudioBuffer.getChannelData(1).slice(startFrame, endFrame)
            : originAudioBuffer.getChannelData(0).slice(startFrame, endFrame);
    const newAudioBuffer = new AudioBuffer({
        sampleRate: sampleRate,
        length: mono.length,
        numberOfChannels: 2,
    });
    newAudioBuffer.getChannelData(0).set(mono);
    newAudioBuffer.getChannelData(1).set(stereo);
    return newAudioBuffer;
}
/**
 * Redo Undo Function
 */
let isUndoing = false;
async function undo() {
    var _a;
    if (isUndoing || undoSourceList.length <= 0) {
        return;
    }
    isUndoing = true;
    const currentPlayTime = getCurrentPlayTime();
    pushStore(redoSourceList, sourceStore);
    pushStore(redoTrackList, trackSourceStore);
    const tempPoppedSourceMap = undoSourceList.pop();
    const tempPoppedTrackMap = undoTrackList.pop();
    if (tempPoppedSourceMap) sourceStore = tempPoppedSourceMap;
    if (tempPoppedTrackMap) trackSourceStore = tempPoppedTrackMap;
    resetTrackSound();
    recreateAllElement();
    (_a = document.getElementById("selected_bar")) === null || _a === void 0
        ? void 0
        : _a.remove();
    await adjustStartOffset(currentPlayTime);
    isUndoing = false;
}
let isRedoing = false;
async function redo() {
    var _a;
    if (isRedoing || redoSourceList.length <= 0) {
        return;
    }
    isRedoing = true;
    const currentPlayTime = getCurrentPlayTime();
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    const tempPoppedSourceMap = redoSourceList.pop();
    const tempPoppedTrackMap = redoTrackList.pop();
    if (tempPoppedSourceMap) sourceStore = tempPoppedSourceMap;
    if (tempPoppedTrackMap) trackSourceStore = tempPoppedTrackMap;
    resetTrackSound();
    recreateAllElement();
    (_a = document.getElementById("selected_bar")) === null || _a === void 0
        ? void 0
        : _a.remove();
    await adjustStartOffset(currentPlayTime);
    isRedoing = false;
}
function pushStore(array, store) {
    array.push(deepCopyMap(store));
    if (array.length >= 10) {
        array.shift();
    }
}
function clearRedoList() {
    redoSourceList.length = 0;
    redoTrackList.length = 0;
}
function getCurrentPlayTime() {
    return (parseFloat(timeStick.style.left) - stickStartOffset) / widthRatio;
}
function recreateAllElement() {
    removeAllElement();
    removeAllSelected();
    for (const track of trackSourceStore.values()) {
        createSoundbar(track.trackNumber);
        const waveBox = document.getElementById(track.trackKey);
        for (const source of sourceStore.values()) {
            if (track.trackKey === source.trackKey) {
                const waveBar = createWaveBar(source.index, source.trackNumber);
                waveBox === null || waveBox === void 0
                    ? void 0
                    : waveBox.appendChild(waveBar);
            }
        }
    }
    const trackKey = currentSelectedTrack ? currentSelectedTrack.id : "";
    selectTrack(trackKey);
    drawAllWave();
    const currentPlayTime = getCurrentPlayTime();
    drawStick(currentPlayTime);
}
function removeAllElement() {
    const waveBars = document.querySelectorAll(".sound_box");
    const trackPlayButtons = document.querySelectorAll(".track_play_button");
    waveBars.forEach((waveBar) => {
        waveBar.remove();
    });
    trackPlayButtons.forEach((button) => {
        button.remove();
    });
}
function resetTrackSound() {
    for (const track of trackSourceStore.values()) {
        currentTrackSoundStore.set(
            track.trackKey,
            new TrackSound(track.trackNumber, null)
        );
    }
    currentCombinedBuffer = null;
}
/**
 * Recording Function
 */
function startRecording() {
    if (navigator.mediaDevices) {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                recorder = new MediaRecorder(stream, {
                    mimeType: "audio/webm",
                });
                recorder.addEventListener("dataavailable", (event) => {
                    recordedData.push(event.data);
                });
                recorder.addEventListener("stop", (event) => {
                    const fileReader = new FileReader();
                    const blob = new Blob(recordedData, { type: "audio/webm" });
                    fileReader.readAsArrayBuffer(blob);
                    fileReader.onload = async function () {
                        const arrayBuffer = fileReader.result;
                        if (arrayBuffer instanceof ArrayBuffer) {
                            const audioBuffer = await audioCtx.decodeAudioData(
                                arrayBuffer
                            ); // 이 메소드는 MP3와 WAV, webm 등의 확장자에만 가능하다는 듯 하다.
                            waveIndex++;
                            trackNumber++;
                            fileIndex++;
                            recordIndex++;
                            const originSource = new OriginSource(
                                fileIndex,
                                `recordFile${recordIndex}`,
                                audioBuffer
                            );
                            const sourceNode = new SourceNode(
                                waveIndex,
                                trackNumber,
                                originSource
                            );
                            originSourceStore.set(
                                originSource.fileKey,
                                originSource
                            );
                            sourceStore.set("source" + waveIndex, sourceNode);
                            await setTrackSound(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기
                            // 파일 하나당 트랙추가
                            createOriginFile(originSource);
                            createSoundbar(trackNumber);
                            const wave = [
                                createWaveBar(waveIndex, trackNumber),
                            ];
                            drawWave(wave, sourceNode.trackKey);
                            const currentPlayTime = getCurrentPlayTime();
                            drawStick(currentPlayTime);
                            recorder = null;
                        }
                    };
                });
                recorder.start();
            })
            .catch((error) => console.error(error));
    }
    recordButton.removeEventListener("click", startRecording);
    recordButton.addEventListener("click", endRecording);
    recordButton.classList.add("recording");
}
function endRecording() {
    recorder === null || recorder === void 0 ? void 0 : recorder.stop();
    recordButton.removeEventListener("click", endRecording);
    recordButton.addEventListener("click", startRecording);
    recordButton.classList.remove("recording");
    recordedData.length = 0;
}
/**
 * Downloading Function
 */
async function downloadMixedSound() {
    const mergedBuffer = await getAllTrackMergedBuffer();
    if (mergedBuffer) {
        const leftChannel = mergedBuffer.getChannelData(0);
        const rightChannel = mergedBuffer.getChannelData(1);
        const length = leftChannel.length;
        const wavBuffer = ChannelDataToWave(
            [leftChannel, rightChannel],
            length
        );
        // download file
        const blob = new Blob([wavBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        link.download = "audio.wav";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
const ChannelDataToWave = (channelDatas, len) => {
    const numOfChan = numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer); // buffer를 다룰 때 사용
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;
    // 부호없는 16비트로 정수로 변환
    const setUint16 = (data) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    // 부호없는 32비트로 정수로 변환
    const setUint32 = (data) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };
    // wav 파일의 헤더구조
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length
    for (let i = 0; i < channelDatas.length; i++) {
        channels.push(channelDatas[i]);
    }
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); // 부호있는 16비트 정수로 변환
            pos += 2;
        }
        offset++;
    }
    return buffer;
};
/**
 * 사운드 플레이, 다운로드 등 특정 소스가 있어야 가능한 행동이 현재 가능한 지 확인하고 callback함수를 호출하는 메소드
 */
function checkPlayReady(callback) {
    let isReady = false;
    for (const trackNode of currentTrackSoundStore.values()) {
        if (trackNode) {
            isReady = true;
        }
    }
    if (isReady) {
        callback();
    }
}
/**
 * Sub Function
 */
// Throttle Function
function throttle(callback, limit = 50) {
    let waiting = false;
    return function () {
        if (!waiting) {
            callback.apply(this, arguments);
            waiting = true;
            setTimeout(() => {
                waiting = false;
            }, limit);
        }
    };
}
// Map 깊은 복사
function deepCopyMap(store) {
    const result = new Map();
    store.forEach((value, key) => {
        const copiedNode = copyToSameNode(value);
        result.set(key, copiedNode);
    });
    return result;
}
// map의 key value에서 value에 해당하는 값의 레퍼런스만 달라질 수 있게 값만 복사
function copyToSameNode(node) {
    let result = null;
    if (node instanceof SourceNode) {
        const sourceNode = new SourceNode(
            node.index,
            node.trackNumber,
            node.originSource
        );
        sourceNode.setDuration(node.duration);
        sourceNode.setStartTime(node.startTime);
        sourceNode.resetEndTime();
        sourceNode.setGainValue(node.gainValue);
        sourceNode.resetFrame(node.startFrame);
        result = sourceNode;
    } else if (node instanceof TrackNode) {
        result = new TrackNode(node.trackNumber, node.length, node.duration);
    }
    return result;
}
function copyToNewSourceNode(node) {
    const result = new SourceNode(
        ++waveIndex,
        node.trackNumber,
        node.originSource
    );
    result.setDuration(node.duration);
    result.setStartTime(node.startTime);
    result.resetEndTime();
    result.setGainValue(node.gainValue);
    result.resetFrame(node.startFrame);
    return result;
}
function copyToNewTrackNode(node) {
    const result = new TrackNode(node.trackNumber, node.length, node.duration);
    return result;
}
