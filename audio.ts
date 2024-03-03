// AudioContext
let audioCtx: AudioContext = new AudioContext({ sampleRate: 44100 });

// 인덱스 관련 옵션
let trackNumber: number = 0;
let waveIndex: number = 0;
let fileIndex: number = 0;

// play 관련 옵션
let isPlaying: boolean = false;
let isTrackPlaying: boolean = false;
let currentTrackNode: TrackNode | null = null;
let currentCombinedSource: AudioBufferSourceNode | null = null;
let startOffset: number = 0;
let startTime: number = 0;
let endTime: number = 0;

// recording option
let recorder: MediaRecorder | null = null;
const recordedData: Blob[] = [];

// soundbar 길이 조정
const defaultMinWidth: number = 1500;
const limitPlayDuration: number = 900; // 타임라인은 최대 15분까지
let widthRatio: number = 5; // 초당 5px
let trackWidth: number = defaultMinWidth;
let maxPlayDuration: number = 1500 / widthRatio;

const numberOfChannels: number = 2;
const sampleRate: number = 44100;
let sourceStore: Map<string, SourceNode> = new Map(); // 모든 개별 SourceNode를 저장
let trackSourceStore: Map<string, TrackNode> = new Map(); // 트랙에 포함된 모든 source를 묶어 새 source를 만들고, 그 source로 생성된 SourceNode를 저장
let originSourceStore: Map<string, OriginSource> = new Map(); // sound 원본을 저장해 놓음

// Drag Move Option
let isDragging: boolean = false;
let dragStartX: number = 0;
let previousDragX: number = 0;
let dragStartSelectedBarLeft: number = 0;

// Drag Select option
const currentSelectedSourceList: Set<SourceNode> = new Set();
let currentSelectedSourceNode: SourceNode | null = null;
let currentSelectedTrack: HTMLElement | null = null;
let selectedBarStart: number = 0;
let selectedBarEnd: number = 0;
let dragAreaStartX: number = 0;
let dragAreaStartY: number = 0;

// Copy option
let currentCopiedSourceList: Set<SourceNode> = new Set();

// Undo Redo Option
const undoSourceList: Map<string, SourceNode>[] = [];
const undoTrackList: Map<string, TrackNode>[] = [];
const redoSourceList: Map<string, SourceNode>[] = [];
const redoTrackList: Map<string, TrackNode>[] = [];

// OptionBar
const playButton: HTMLElement = document.getElementById(
    "play_button"
) as HTMLElement;
const initButton: HTMLElement = document.getElementById(
    "init_button"
) as HTMLElement;
const createButton: HTMLElement = document.getElementById(
    "create_button"
) as HTMLElement;
const ratioRange: HTMLInputElement = document.getElementById(
    "ratio"
) as HTMLInputElement;
const cutButton: HTMLElement = document.getElementById(
    "cut_button"
) as HTMLElement;
const deleteButton: HTMLElement = document.getElementById(
    "delete_button"
) as HTMLElement;
const timeInput: HTMLInputElement = document.getElementById(
    "time_input"
) as HTMLInputElement;
const timeAddButton: HTMLElement = document.getElementById(
    "time_add_button"
) as HTMLElement;
const undoButton: HTMLElement = document.getElementById(
    "undo_button"
) as HTMLElement;
const redoButton: HTMLElement = document.getElementById(
    "redo_button"
) as HTMLElement;
const recordButton: HTMLElement = document.getElementById(
    "record_button"
) as HTMLElement;

// FileWindow
const fileInput: HTMLInputElement = document.getElementById(
    "file"
) as HTMLInputElement;
const fileListBox: HTMLElement = document.getElementById(
    "file_list_box"
) as HTMLElement;

// Edit Window
let timeStickInterval: number | undefined = undefined;
let timeStick: HTMLDivElement | null = null;
const editWindow: HTMLElement = document.getElementById(
    "edit_window"
) as HTMLElement;
const editContainer: HTMLElement = document.getElementById(
    "edit_cont"
) as HTMLElement;
const editBox: HTMLElement = document.getElementById("edit_box") as HTMLElement;
const trackContainer: HTMLElement = document.getElementById(
    "track_cont"
) as HTMLElement;
const trackOption: HTMLElement = document.getElementById(
    "track_option"
) as HTMLElement;
const timeLineBox: HTMLElement = document.getElementById(
    "time_line_box"
) as HTMLElement;
const timeLine: HTMLElement = document.getElementById(
    "time_line"
) as HTMLElement;

// stick의 시작 위치
const stickStartOffset: number = 0; // timeLine.getBoundingClientRect().left - editBox.getBoundingClientRect().left (이 부분은 혹시 나중에 타임스틱이 특정 div에서 분리될 때 사용)

class BaseNode {
    trackNumber: number;
    offset: number;
    audioBuffer: AudioBuffer | null;
    gainValue: number;
    length: number;
    duration: number;
    startTime: number;
    endTime: number;
    trackKey: string;

    constructor(trackNumber: number, audioBuffer: AudioBuffer | null) {
        this.trackNumber = trackNumber;
        this.offset = 0;
        this.audioBuffer = audioBuffer;
        this.gainValue = 1;
        this.length = audioBuffer ? audioBuffer.length : 0;
        this.duration = audioBuffer ? audioBuffer.duration : 0;
        this.startTime = 0; // 트랙 내에서 이 소스가 시작하는 시간
        this.endTime = this.startTime + this.duration; // 트랙 내에서 이 소스가 끝나는 시간
        this.trackKey = `track${trackNumber}`;
    }

    setStartTime(startTime: number) {
        this.startTime = startTime;
    }

    resetEndTime() {
        this.endTime = this.startTime + this.duration;
    }

    resetTrackNumber(trackNumber: number) {
        this.trackNumber = trackNumber;
        this.trackKey = "track" + trackNumber;
    }

    setGainValue(gainValue: number) {
        this.gainValue = gainValue;
    }
}

class SourceNode extends BaseNode {
    index: number;
    sourceKey: string;

    constructor(
        index: number,
        trackNumber: number,
        audioBuffer: AudioBuffer | null
    ) {
        super(trackNumber, audioBuffer);
        this.index = index;
        this.sourceKey = "source" + index;
        this.trackKey = "track" + trackNumber;
    }
}

class TrackNode extends BaseNode {
    source: AudioBufferSourceNode | null;

    constructor(trackNumber: number, audioBuffer: AudioBuffer | null) {
        super(trackNumber, audioBuffer);
        this.trackKey = "track" + trackNumber;
        this.source = null;
    }

    setBufferSource(source: AudioBufferSourceNode) {
        this.source = source;
    }
}

class OriginSource {
    fileIndex: number;
    fileName: string;
    audioBuffer: AudioBuffer;
    fileKey: string;

    constructor(fileIndex: number, fileName: string, audioBuffer: AudioBuffer) {
        this.fileIndex = fileIndex;
        this.fileName = fileName;
        this.audioBuffer = audioBuffer;
        this.fileKey = `file${fileIndex}`;
    }
}

// todo: 원본 붙여 넣기 기능 만들기

init();

/**
 * Init Options
 */
function init() {
    drawTimeLine();
    drawStick(0);
    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    document.addEventListener("mousedown", (event) => {
        if (event.target instanceof HTMLElement) {
            if (event.target.id === "drag_box") {
                removeAllSelected();
            }
            if (event.target.classList.contains("option")) return; // option에 해당하는 작업은 modal이나 select된 값들이 필요하므로 유지
            document.getElementById("option_modal")?.remove();
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

    document.addEventListener("keydown", async function (event) {
        if (event.ctrlKey && event.key === "v") {
            if (currentSelectedTrack !== null) {
                await pasteSource();
            }
        }
    });

    document.addEventListener("keydown", async function (event) {
        if (event.ctrlKey && event.key === "x") {
            event.stopPropagation();
            if (currentSelectedSourceList.size !== 0) {
                await deleteSource();
            }
        }
    });

    document.addEventListener("keydown", async function (event) {
        if (!event.ctrlKey && event.key === "x") {
            if (currentSelectedSourceList.size !== 0) {
                const currentTime = getCurrentPlayTime();
                currentSelectedSourceList.forEach((source) => {
                    // 현재 지정된 시간이 선택된 wave 안에 없을 때에는 메소드를 종료
                    if (
                        currentTime >= source.startTime &&
                        currentTime <= source.endTime
                    ) {
                        currentSelectedSourceNode = source;
                    }
                });
                if (currentSelectedSourceNode)
                    await cutSound(currentSelectedSourceNode, currentTime);
            }
        }
    });

    document.addEventListener("keydown", async function (event) {
        if (event.ctrlKey && event.key === "z") {
            await undo();
        }
    });
}

function removeAllSelected() {
    document.getElementById("selected_bar")?.remove();
    currentSelectedSourceNode = null;
    currentSelectedSourceList.clear();
}

createButton?.addEventListener("click", downloadMixedSound);
timeLine?.addEventListener("click", clickStartOffset);
initButton?.addEventListener("click", initPlayTime);
undoButton?.addEventListener("click", async () => {
    await undo();
});
redoButton?.addEventListener("click", async () => {
    await redo();
});
recordButton?.addEventListener("click", startRecording);

playButton?.addEventListener("click", () => {
    checkPlayReady(play);
});

ratioRange?.addEventListener("input", () => {
    const beforeWidthRatio: number = widthRatio; // 기존의 widthRatio를 저장해 둠
    const beforeChangePlayTime: number = getCurrentPlayTime(); // widthRatio를 변경하기 전에 playTime을 계산해 놓아야 함
    widthRatio = parseFloat(ratioRange.value);
    drawTrack();
    drawAllWave();
    drawStick(beforeChangePlayTime);
    drawTimeLine();
    drawSelectedBar(beforeWidthRatio);
});

cutButton?.addEventListener("click", async (event) => {
    event.stopPropagation();

    const currentTime: number = getCurrentPlayTime();
    currentSelectedSourceList.forEach((source) => {
        // 현재 지정된 시간이 선택된 wave 안에 없을 때에는 메소드를 종료
        if (currentTime >= source.startTime && currentTime <= source.endTime) {
            currentSelectedSourceNode = source;
        }
    });

    if (currentSelectedSourceNode === null) return;
    cutSound(currentSelectedSourceNode, currentTime);
    await adjustStartOffset(currentTime);
});

deleteButton?.addEventListener("click", deleteSource);

async function deleteSource() {
    if (currentSelectedSourceList.size <= 0) return;
    document.getElementById("option_modal")?.remove();
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    clearRedoList();

    let trackNumber: number = 0;
    const currentTime: number = getCurrentPlayTime();
    document.getElementById("selected_bar")?.remove();
    currentSelectedSourceList.forEach((source) => {
        document.getElementById(source.sourceKey)?.remove();
        sourceStore.delete(source.sourceKey);
        trackNumber = source.trackNumber;
    });
    await mergeTrackSources(trackNumber);
    currentSelectedSourceList.clear();
    await adjustStartOffset(currentTime);
}

timeAddButton?.addEventListener("click", () => {
    maxPlayDuration += parseInt(timeInput.value);
    timeInput.value = "0";
    drawTrack();
    drawTimeLine();
});

async function initPlayTime() {
    await adjustStartOffset(0);
    drawStick(0);
}

fileInput?.addEventListener("change", (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!audioCtx) audioCtx = new AudioContext({ sampleRate: 44100 });

    if (event.target instanceof HTMLInputElement) {
        const file: File | null = event.target.files
            ? event.target.files[0]
            : null;
        const fileReader: FileReader = new FileReader();
        const fileName: string = file!.name;

        if (file) fileReader.readAsArrayBuffer(file);
        fileReader.onload = async function () {
            const arrayBuffer: string | ArrayBuffer | null = fileReader.result;
            if (arrayBuffer instanceof ArrayBuffer) {
                const audioBuffer: AudioBuffer | null =
                    await audioCtx.decodeAudioData(arrayBuffer); // 이 메소드는 MP3와 WAV 확장자에만 가능하다는 듯 하다.
                waveIndex++;
                trackNumber++;
                fileIndex++;
                const sourceNode = new SourceNode(
                    waveIndex,
                    trackNumber,
                    audioBuffer
                );
                const originSource = new OriginSource(
                    fileIndex,
                    fileName,
                    audioBuffer
                );
                sourceStore.set("source" + waveIndex, sourceNode);
                originSourceStore.set("file" + fileIndex, originSource);

                await mergeTrackSources(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기

                // 파일 하나당 트랙 및 웨이브 추가
                createSoundbar(trackNumber);
                const wave = [createWaveBar(waveIndex, trackNumber)];
                drawWave(wave, sourceNode.trackKey);

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
function createOriginFile(originSource: OriginSource) {
    const fileShowerBox: HTMLDivElement = document.createElement("div");
    fileShowerBox.id = originSource.fileKey;
    fileShowerBox.classList.add("file_shower_box");
    fileShowerBox.addEventListener("contextmenu", (event) => {
        showOriginOption(event, originSource.fileKey);
    });

    const imgShower: HTMLDivElement = document.createElement("div");
    imgShower.classList.add("img_shower");

    const nameShower: HTMLDivElement = document.createElement("div");
    nameShower.classList.add("name_shower");
    nameShower.innerText = originSource.fileName;

    fileShowerBox.appendChild(imgShower);
    fileShowerBox.appendChild(nameShower);
    fileListBox?.append(fileShowerBox);
}

function showOriginOption(event: MouseEvent, fileKey: string) {
    const optionModal: HTMLDivElement = document.createElement("div");
    const copyOrigin: HTMLDivElement = document.createElement("div");

    optionModal.id = "option_modal";
    optionModal.style.left = event.pageX + "px";
    optionModal.style.top = event.pageY - 10 + "px";

    // Delete Element
    copyOrigin.classList.add("option", "ind_option");
    copyOrigin.innerText = "원본 복사하기";
    copyOrigin.addEventListener("click", () => {
        document.getElementById("option_modal")?.remove();
        currentCopiedSourceList.clear();
        const originAudioBuffer: AudioBuffer =
            originSourceStore.get(fileKey)!.audioBuffer;
        const newSource: SourceNode = new SourceNode(
            ++waveIndex,
            0,
            originAudioBuffer
        );
        currentCopiedSourceList.add(newSource);
    });

    optionModal.appendChild(copyOrigin);
    document.body.appendChild(optionModal);
}

function createSoundbar(trackNumber: number) {
    // 사운드가 플레이 되고 있을 때 파일을 추가하면 drawStick() 메소드에서 현재 시간을 필요로 함
    const currentPlayTime: number =
        timeStick !== null ? getCurrentPlayTime() : 0;

    const soundBox: HTMLDivElement = document.createElement("div");
    soundBox.id = "track" + trackNumber;
    soundBox.classList.add("sound_box");

    const waveBox: HTMLDivElement = document.createElement("div");
    waveBox.classList.add("wave_box", "track" + trackNumber);
    waveBox.addEventListener("contextmenu", showTrackOption);
    waveBox.addEventListener("mousedown", dragstart);

    const dragBox: HTMLDivElement = document.createElement("div");
    dragBox.id = "drag_box";
    dragBox.classList.add("track" + trackNumber);

    const trackPlayButton: HTMLButtonElement = document.createElement("button");
    trackPlayButton.classList.add("track" + trackNumber, "track_play_button");
    trackPlayButton.innerText = "▶";
    trackPlayButton.addEventListener("click", () => {
        const track = trackSourceStore.get("track" + trackNumber);
        if (track) {
            playTrackSound(track);
        }
    });

    trackOption?.appendChild(trackPlayButton);
    soundBox.appendChild(waveBox);
    waveBox.appendChild(dragBox);
    trackContainer?.appendChild(soundBox);

    drawTrack();
    drawTimeLine();
    drawStick(currentPlayTime); // 이 메소드를 최초 한 번만 수행하는 형태로 고쳐도 됨
}

function createWaveBar(waveIndex: number, trackNumber: number) {
    const waveBar: HTMLCanvasElement = document.createElement("canvas");
    const sourceKey: string = "source" + waveIndex;
    const trackKey: string = "track" + trackNumber;
    waveBar.id = sourceKey;
    waveBar.classList.add(trackKey, "wave_bar");
    waveBar.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement) {
            selectTrack(event.target.classList[0]);
            selectWaveBar(event.target.id);
        }
    });
    waveBar.addEventListener("contextmenu", showTrackOption);
    return waveBar;
}

function selectWaveBar(sourceKey: string) {
    document.getElementById("selected_bar")?.remove;
    currentSelectedSourceList.clear();
    const source = sourceStore.get(sourceKey);
    if (source) {
        currentSelectedSourceList.add(source);
        selectedBarStart = source.startTime;
        selectedBarEnd = source.endTime;
        createSelectedBar(source!.trackKey, source.sourceKey);
    }
}

function createSelectedBar(trackKey, sourceKey = "none") {
    document.getElementById("selected_bar")?.remove();
    const waveBox = document.querySelector(`#${trackKey} .wave_box`);
    const selectedBar = document.createElement("div");
    selectedBar.addEventListener("contextmenu", showWaveOption);
    selectedBar.addEventListener("mousedown", dragInit);
    selectedBar.id = "selected_bar";
    selectedBar.classList.add(trackKey, sourceKey); // 첫 번째 클래스가 trackKey
    selectedBar.style.width = `${
        (selectedBarEnd - selectedBarStart) * widthRatio
    }px`;
    selectedBar.style.left = `${selectedBarStart * widthRatio}px`;
    waveBox?.appendChild(selectedBar);
}

/**
 * Show Option Function
 */
function showWaveOption(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById("option_modal")?.remove();

    let sourceKey: string = "";
    if (event.target instanceof HTMLElement) {
        sourceKey = event.target.classList[1];
    }
    const source: SourceNode | undefined = sourceStore.get(sourceKey);

    const optionModal: HTMLDivElement = document.createElement("div");
    const copy: HTMLDivElement = document.createElement("div");
    const sourcePaste: HTMLDivElement = document.createElement("div");
    const sourceDelete: HTMLDivElement = document.createElement("div");

    optionModal.id = "option_modal";
    optionModal.style.left = event.pageX + "px";
    optionModal.style.top = event.pageY - 10 + "px";

    // GainInput Element
    if (sourceKey !== "none" && source) {
        const wrapBox: HTMLDivElement = document.createElement("div");
        const gainInput: HTMLInputElement = document.createElement("input");
        wrapBox.classList.add("option", "ind_option");
        gainInput.classList.add("option");
        gainInput.setAttribute("type", "range");
        gainInput.setAttribute("min", "0");
        gainInput.setAttribute("max", "2");
        gainInput.setAttribute("step", "0.05");
        gainInput.setAttribute("value", String(source.gainValue));
        gainInput.addEventListener("change", async () => {
            source.setGainValue(parseFloat(gainInput.value));
            await mergeTrackSources(source.trackNumber);
            await adjustStartOffset(getCurrentPlayTime());
            const waves = [
                document.getElementById(source.sourceKey) as HTMLCanvasElement,
            ]; // drawWave가 waveBar배열을 인자로 받기 때문에 번거롭지만 이렇게 해야 함
            drawWave(waves, source.trackKey);
        });
        wrapBox.appendChild(gainInput);
        optionModal.appendChild(wrapBox);
    }

    // Copy Element
    copy.classList.add("option", "ind_option");
    copy.innerText = "복사하기";
    copy.addEventListener("click", () => {
        currentCopiedSourceList.clear();
        for (const source of currentSelectedSourceList.values()) {
            document.getElementById("option_modal")?.remove();
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

function showTrackOption(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById("option_modal")?.remove();
    removeAllSelected();

    if (!(event.target instanceof HTMLElement)) return;
    const trackKey: string = event.target.classList[0];
    selectTrack(trackKey);

    const optionModal: HTMLDivElement = document.createElement("div");
    const trackDelete: HTMLDivElement = document.createElement("div");
    const sourcePaste: HTMLDivElement = document.createElement("div");

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
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);

    document.getElementById("option_modal")?.remove();
    document.getElementById(trackKey)?.remove();
    document.querySelector(`#track_option .${trackKey}`)?.remove();
    trackSourceStore.delete(trackKey);
    for (const source of sourceStore.values()) {
        if (source.trackKey === trackKey) {
            sourceStore.delete(source.sourceKey);
        }
    }

    if (isTrackPlaying && currentTrackNode) {
        // 트랙에 변화가 있을 때 변화된 트랙이 새롭게 set되었을 수 있기 때문에 trackKey를 이용해 값을 새로가져와야 함
        const trackNode = trackSourceStore.get(currentTrackNode.trackKey);
        if (trackNode) playTrackSound(trackNode);
    } else if (isPlaying) {
        play();
    }

    const currentPlayTime = getCurrentPlayTime();
    adjustStartOffset(currentPlayTime);
    drawStick(currentPlayTime);
}

async function pasteSource() {
    document.getElementById("option_modal")?.remove();
    if (currentCopiedSourceList.size === 0) return;
    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);

    const copiedSourceArray: SourceNode[] = [];
    const waves: HTMLCanvasElement[] = [];
    const trackKey: string = currentSelectedTrack!.id;
    const trackNumber: number = parseInt(trackKey.slice(5, 6));
    const currentPlayTime: number = getCurrentPlayTime();
    let startTime: number = currentPlayTime;
    let minStartTime: number = currentPlayTime;
    let maxEndTime: number = 0;

    currentCopiedSourceList.forEach((source) => {
        const copiedSource: SourceNode | TrackNode | null =
            copyToNewNode(source);
        if (copiedSource instanceof SourceNode) {
            sourceStore.set(copiedSource.sourceKey, copiedSource);
            copiedSourceArray.push(copiedSource);
        }
    });

    copiedSourceArray.sort(function (a, b) {
        return a.startTime - b.startTime;
    });

    // 선택된 source가 있고 같은 트랙일 경우 경우 그 source의 endTime에 이어서 붙이도록 하기 위한 startTime 초기화 과정
    if (currentSelectedSourceList.size !== 0) {
        let tempStartTime: number = 0;
        for (const source of currentSelectedSourceList.values()) {
            tempStartTime = Math.max(source.endTime, tempStartTime);
        }
        startTime = tempStartTime;
        minStartTime = tempStartTime;
    }
    removeAllSelected(); // coverSound()를 호출할 때 currentSelectedSourceList가 영향을 주기 때문에 초기화 과정을 거침

    // 복사한 source들의 위치를 조정하고 waveBar를 생성
    for (let i = 0; i < copiedSourceArray.length; i++) {
        const sourceNode: SourceNode = copiedSourceArray[i];
        sourceNode.startTime = startTime;
        sourceNode.resetEndTime();
        sourceNode.resetTrackNumber(trackNumber);
        currentSelectedSourceList.add(sourceNode);
        startTime += sourceNode.duration;
        maxEndTime = Math.max(maxEndTime, sourceNode.endTime);
        const waveBar: HTMLCanvasElement = createWaveBar(
            sourceNode.index,
            sourceNode.trackNumber
        );
        waves.push(waveBar);
    }

    await coverSound(minStartTime, maxEndTime, trackKey);
    await mergeTrackSources(trackNumber);
    await adjustStartOffset(currentPlayTime);
    drawTrack();
    drawTimeLine();
    drawWave(waves, trackKey);

    // 복사된 source들이 선택되도록 만들기
    selectedBarStart = minStartTime;
    selectedBarEnd = maxEndTime;
    createSelectedBar(trackKey);
}

/**
 * Drag And Select Function
 */
function dragstart(event: MouseEvent) {
    event.preventDefault();
    // event.stopPropagation();
    if (!(event.target instanceof HTMLElement)) return;
    if (event.button === 2 || event.target.id !== "drag_box") return;
    removeAllSelected();

    const trackKey: string = event.target.classList[0];
    const soundBox: HTMLElement | null = document.getElementById(trackKey);
    selectTrack(trackKey);

    dragAreaStartX = event.offsetX;
    dragAreaStartY = event.offsetY;

    const dragArea: HTMLDivElement = document.createElement("div");
    dragArea.id = "drag_area";
    dragArea.classList.add(trackKey);
    dragArea.style.left = `${dragAreaStartX}px`;
    dragArea.style.top = `${dragAreaStartY}px`;

    const dragSpace: HTMLDivElement = document.createElement("div");
    dragSpace.id = "drag_space";
    dragSpace.classList.add(trackKey);
    dragSpace.style.zIndex = "99";
    dragSpace.style.width = trackWidth + "px";

    soundBox?.prepend(dragArea);
    soundBox?.prepend(dragSpace);

    document.addEventListener("mousemove", moveDragArea);
    dragSpace.addEventListener("mouseup", selectAreaElements);
    dragSpace.addEventListener("mouseleave", selectAreaElements);
}

function selectTrack(trackKey: string) {
    const soundBox: HTMLElement | null = document.getElementById(trackKey);
    if (currentSelectedTrack) {
        currentSelectedTrack.classList.remove("selected");
    }
    soundBox?.classList.add("selected");
    currentSelectedTrack = soundBox;
}

function moveDragArea(event: MouseEvent) {
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

function selectAreaElements(event: MouseEvent) {
    const dragArea = document.getElementById("drag_area");
    if (dragArea instanceof HTMLElement) {
        const trackKey: string = dragArea?.classList[0];
        const dragWidth = parseFloat(dragArea.style.width)
            ? parseFloat(dragArea.style.width)
            : 0;
        const areaStart = parseFloat(dragArea.style.left); // 드래그 영역의 맨 왼쪽 지점
        const areaEnd = areaStart + dragWidth; // 드래그 영역의 맨 오른쪽 지점
        removeAllDragAreaEvent();

        let tempStart: number = 999999;
        let tempEnd: number = 0;
        for (const source of sourceStore.values()) {
            //같은 트랙에 있는 source에 대해서만 수행
            if (source.trackKey === trackKey) {
                const sourceStart: number = source.startTime * widthRatio; // source의 waveBar left값
                const sourceEnd: number = source.endTime * widthRatio; // source의 끝 위치

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
    document.removeEventListener("mousemove", moveDragArea);
    document.getElementById("drag_space")?.remove();
    document.getElementById("drag_area")?.remove();
}

/**
 * Move WaveBar Function
 */
function dragInit(event: MouseEvent) {
    event.preventDefault();
    if (event.button === 2) return;
    document.addEventListener("mousemove", moveMultiSelectedBar);
    document.addEventListener("mouseup", moveWaveBar);

    dragStartX = event.clientX;
    previousDragX = event.clientX;
    const selectedBar = document.getElementById("selected_bar");
    dragStartSelectedBarLeft = parseFloat(selectedBar!.style.left);

    if (event.target instanceof HTMLElement) {
        const trackKey: string = event.target.classList[0];
        const dragBoxes = document.querySelectorAll("#drag_box");
        dragBoxes.forEach((dragBox) => {
            if (
                dragBox.classList[0] !== trackKey &&
                dragBox instanceof HTMLElement
            ) {
                dragBox.style.zIndex = "3";
                dragBox.addEventListener("mouseenter", moveToAnotherTrack);
            }
        });
    }
}

/* function moveSelectedBar(event) {
    event.preventDefault();
    event.stopPropagation();
    const selectedBar = document.getElementById("selected_bar");
    const selectedBarWidth = parseFloat(selectedBar.style.width);
    const trackKey = selectedBar.classList[0];
    const sourceKey = selectedBar.classList[1];
    const left = parseFloat(selectedBar.style.left); // 움직이기 이전 위치
    const movedX = previousDragX - event.clientX; // 움직인 거리
    const newLeft = left - movedX; // 고정될 위치이자 startTime의 시작 지점
    const endTimeOffset = newLeft + selectedBarWidth; // 끝나는 지점
    let stickLeft = false; // 다른 waveBar의 양 끝 지점에 가까워 붙이는 지
    let stickLeftOffset = 0;


    // 다른 waveBar의 양 끝 지점에 가까울 경우 붙이도록 하는 로직
    for (const source of sourceStore.values()) {
        if(source.trackKey === trackKey && source.sourceKey !== sourceKey){
            const waveBar = document.getElementById(source.sourceKey);
            const waveBarStart = parseFloat(waveBar.style.left);
            const waveBarEnd = parseFloat(waveBar.style.left) + parseFloat(waveBar.style.width);
            if(Math.abs(waveBarStart - endTimeOffset) < 15){ 
                stickLeft = true; 
                stickLeftOffset = waveBarStart - selectedBarWidth;
            }else if(Math.abs(waveBarEnd - newLeft) < 15){
                stickLeft = true; 
                stickLeftOffset = waveBarEnd;
            }
        }
    }

    if(newLeft < 0)
        selectedBar.style.left = "0px";
    else if((newLeft + selectedBarWidth) >= trackWidth)
        selectedBar.style.left = (trackWidth - selectedBarWidth) + "px";
    else if(stickLeft){
        selectedBar.style.left = stickLeftOffset + "px";
    }else
        selectedBar.style.left = newLeft + "px";

    if(!stickLeft) previousDragX = event.clientX;
} */

function moveMultiSelectedBar(event: MouseEvent) {
    event.preventDefault();
    const selectedBar = document.getElementById("selected_bar") as HTMLElement;
    const trackKey: string = selectedBar.classList[0];
    const sourceKeyList: Set<string> = new Set();
    const selectedBarWidth: number = parseFloat(selectedBar.style.width);
    const selectedBarLeft: number = parseFloat(selectedBar.style.left);
    const movedX: number = previousDragX - event.clientX; // 움직인 거리
    let stickLeft: boolean = false; // 다른 waveBar의 양 끝 지점에 가까워 붙이는 지
    let stickLeftOffset: number = 0;

    currentSelectedSourceList.forEach((source) => {
        sourceKeyList.add(source.sourceKey);
    });

    const newLeft: number = selectedBarLeft - movedX; //고정될 위치이자 startTime의 시작 지점
    const endTimeOffset: number = newLeft + selectedBarWidth; //끝나는 지점

    // 다른 waveBar의 양 끝 지점에 가까울 경우 붙이도록 하는 로직
    for (const source of sourceStore.values()) {
        if (
            source.trackKey === trackKey &&
            !sourceKeyList.has(source.sourceKey)
        ) {
            // 같은 트랙이면서 선택된 sound가 아닌 것
            const waveBar = document.getElementById(
                source.sourceKey
            ) as HTMLElement;
            const waveBarStart: number = parseFloat(waveBar.style.left);
            const waveBarEnd: number =
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
    const trackKey = event.target.classList[0]; // dragBox(event.target)의 클래스 중 trackKey부분 추출
    const selectedBar = document.getElementById("selected_bar");
    const waveBox = document.querySelector("#" + trackKey + " .wave_box");
    if (selectedBar) {
        waveBox?.appendChild(selectedBar);
        selectedBar.classList.replace(selectedBar.classList[0], trackKey);
    }

    const dragBoxes = document.querySelectorAll("#drag_box");
    dragBoxes.forEach((dragBox) => {
        if (
            dragBox.classList[0] !== trackKey &&
            dragBox instanceof HTMLElement
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
    document.removeEventListener("mousemove", moveMultiSelectedBar);
    document.removeEventListener("mouseup", moveWaveBar);

    const selectedBar = document.getElementById("selected_bar") as HTMLElement;
    const trackKey: string = selectedBar.classList[0];
    const waveBox = document.querySelector(`#${trackKey} .wave_box`);
    const trackNumber: number = parseInt(trackKey.slice(5, 6));
    const currentTime: number = getCurrentPlayTime();
    const selectedBarLeft: number = parseFloat(selectedBar.style.left);
    const selectedBarWidth: number = parseFloat(selectedBar.style.width);
    const moveAmount: number = selectedBarLeft - dragStartSelectedBarLeft; // 이동해야 하는 거리
    const moveTime: number = moveAmount / widthRatio; // 이동해야 하는 시간
    selectTrack(trackKey);

    currentSelectedSourceList.forEach((source) => {
        const waveBar = document.getElementById(
            source.sourceKey
        ) as HTMLElement;
        const startTime: number =
            source.startTime + moveTime > 0 ? source.startTime + moveTime : 0;
        waveBar.style.left = parseFloat(waveBar.style.left) + moveAmount + "px"; // 기존의 left에 움직인 거리만큼 더함
        waveBar.classList.replace(waveBar.classList[0], trackKey);
        source.setStartTime(startTime);
        source.resetEndTime();
        source.resetTrackNumber(trackNumber);
        waveBox?.appendChild(waveBar);
    });

    const minStartTime: number = selectedBarLeft / widthRatio;
    const maxEndTime: number =
        (selectedBarWidth + selectedBarLeft) / widthRatio;
    await coverSound(minStartTime, maxEndTime, trackKey);

    for (const track of trackSourceStore.values()) {
        await mergeTrackSources(track.trackNumber);
    }

    await adjustStartOffset(currentTime);
}

async function coverSound(
    minStartTime: number,
    maxEndTime: number,
    trackKey: string
) {
    const trackSources: SourceNode[] = []; // 현재 트랙의 모든 소스들
    const middleSources: SourceNode[] = []; // 완전히 사라져버릴 애들
    let biggerSource: SourceNode | null = null; // 더 커서 쪼개질 애
    let leftSource: SourceNode | null = null; // 잘려서 왼쪽에 남을 애
    let rightSource: SourceNode | null = null; // 잘려서 오른쪽에 남을 애

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
        if (leftSource)
            await cutSound(leftSource, minStartTime, false, true, false);
        if (rightSource)
            await cutSound(rightSource, maxEndTime, true, false, false);
        if (middleSources)
            middleSources.forEach((source) => {
                sourceStore.delete(source.sourceKey);
                document.getElementById(source.sourceKey)?.remove();
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
        (target as HTMLElement).style.width = trackWidth + "px";
    });
    waveBoxList.forEach((target) => {
        (target as HTMLElement).style.width = trackWidth + "px";
    });
    dragBoxList.forEach((target) => {
        (target as HTMLElement).style.width = trackWidth + "px";
    });
}

function setTrackWidth() {
    let playDuration = 0;
    for (const track of trackSourceStore.values()) {
        if (track) {
            playDuration = Math.max(playDuration, track.duration);
        }
    }
    maxPlayDuration = Math.max(maxPlayDuration, playDuration);
    trackWidth = maxPlayDuration * widthRatio;
}

function drawAllWave() {
    const waves = document.querySelectorAll(".wave_bar");
    for (const wave of waves) {
        const element = wave as HTMLCanvasElement;
        const source = sourceStore.get(wave.id);
        if (source) {
            element.width = source.duration * widthRatio;
            element.style.left = source.startTime * widthRatio + "px"; // 시작 지점
            element.style.width = source.duration * widthRatio + "px"; // border크기 때문에 2px 뺌
            createWave(source.sourceKey);
        }
    }
}

function drawWave(waves: HTMLCanvasElement[], trackKey: string) {
    const waveBox = document.getElementById(trackKey);
    for (const wave of waves) {
        const source = sourceStore.get(wave.id);
        if (source) {
            wave.width = source.duration * widthRatio;
            wave.style.left = source.startTime * widthRatio + "px"; // 시작 지점
            wave.style.width = source.duration * widthRatio + "px"; // border크기 때문에 2px 뺌
            waveBox?.appendChild(wave);
            createWave(source.sourceKey);
        }
    }
}

function createWave(sourceKey: string) {
    const source = sourceStore.get(sourceKey);
    const wave = document.getElementById(sourceKey) as HTMLCanvasElement;
    const samplesPerSec: number = 30; // 1초당 표시할 샘플의 수
    const rawData = source?.audioBuffer
        ? source.audioBuffer.getChannelData(0)
        : null; // 첫번쨰 채널의 AudioBuffer
    const totalSamples = source!.duration * samplesPerSec; // 구간 처리 후 전체 샘플 수
    const blockSize = Math.floor(sampleRate / samplesPerSec); // 샘플링 구간 사이즈
    const filteredData: number[] = [];

    if (!rawData) throw new Error("There is no rawData");
    for (let i = 0; i < totalSamples; i++) {
        const blockStart = blockSize * i; // 샘플 구간 시작 포인트
        let blockSum = 0;

        for (let j = 0; j < blockSize; j++) {
            if (rawData[blockStart + j]) {
                blockSum = blockSum + Math.abs(rawData[blockStart + j]);
            }
        }

        filteredData.push(blockSum / blockSize); // 구간 평균치를 결과 배열에 추가
    }

    const ctx = wave.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const canvasHeight = wave.height;
    const canvasWidth = wave.width;

    if (ctx) {
        ctx.scale(dpr, dpr);
        // ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 샘플 1개가 차지할 넓이
        const sampleWidth: number = canvasWidth / filteredData.length;
        let lastX: number = 0; // x축 좌표

        ctx.beginPath(); // 선을 그리기 위해 새로운 경로를 만든다.
        ctx.moveTo(lastX, canvasHeight);
        ctx.strokeStyle = "rgb(102, 156, 192)"; // 라인 컬러 설정
        ctx.fillStyle = "rgb(102, 156, 192)"; // 그래프 내부를 채울 컬러 설정

        filteredData.forEach((sample, index) => {
            // 샘플 데이터 배열 루프
            const x: number = sampleWidth * index; // x 좌표
            ctx.lineWidth = 2; // 라인 그래프의 두께
            ctx.lineTo(
                x,
                canvasHeight -
                    Math.abs(sample * canvasHeight * source!.gainValue) // y축 좌표
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

function drawSelectedBar(beforeWidthRatio: number) {
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
    const allLabel = document.querySelectorAll(".time_label");
    allLabel.forEach((label) => label.remove());

    let per: number = 10; // 몇 초 단위로 라벨을 붙일 것인 지 (기본 = 10초)
    const perMini: number = 1; // 미니 라벨 붙이는 간격
    const playTime: number = trackWidth / widthRatio;

    if (widthRatio >= 25) {
        // widthRatio가 커지면 timeLine의 width가 늘어남에 따라 초당 찍을 수 있는 시간도 늘어남
        per = 2;
    } else if (widthRatio >= 10) {
        per = 5;
    }

    for (let i = 0; i < playTime; i++) {
        if (i % per === 0) {
            const second: string = String(i % 60).padStart(2, "0"); // 두 자리수 표현
            const minute: string = String(Math.floor(i / 60)).padStart(2, "0"); // 두 자리수 표현
            const left: number = widthRatio * i;
            const label = document.createElement("label");

            label.classList.add("time_label");
            label.style.left = left + "px";
            label.innerText = minute + ":" + second;
            timeLine?.appendChild(label);
        } else if (i % perMini === 0) {
        }
    }

    if (timeLineBox) timeLineBox.style.width = trackWidth + "px";
    if (timeLine) timeLine.style.width = trackWidth + "px";
}

function drawStick(currentPlayTime: number) {
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

    trackContainer?.prepend(newStick);
    timeStick = newStick;
}

async function moveStick() {
    if (timeStick) {
        const currentStickLeft: number = timeStick.style.left
            ? parseFloat(timeStick.style.left)
            : stickStartOffset;
        timeStick.style.left = currentStickLeft + widthRatio / 20 + "px"; // 인터벌을 0.05초 단위로 설정하면, 0.05초당 초당 픽셀(widthRatio)을 20으로 나눈 값만큼 이동
        if (currentStickLeft - stickStartOffset >= trackWidth) {
            // 스틱이 트랙의 길이 보다 넘어가면 재생이 끝난 것으로 간주하고 처음으로 돌아감
            clearInterval(timeStickInterval);
            timeStick.style.left = stickStartOffset + "px";
            await initPlayTime(); // Start Offset 초기화

            const trackNode = currentTrackNode
                ? trackSourceStore.get(currentTrackNode.trackKey)
                : null;
            isTrackPlaying && trackNode
                ? playTrackSound(trackNode)
                : await play();
        }
    }
}

/**
 * Sound Play Function
 */
async function play(isAdjust = false) {
    if (isPlaying) {
        endTime = new Date().getTime();
        currentCombinedSource!.stop();
        clearInterval(timeStickInterval);
        startOffset += (endTime - startTime) / 1000;
        isPlaying = false;
        changePlayPause(false, null, isAdjust);
    } else {
        if (isTrackPlaying && currentTrackNode) {
            // 이미 플레이중인 개별 트랙이 있을 경우
            const trackNode = trackSourceStore.get(currentTrackNode.trackKey);
            if (trackNode) playTrackSound(trackNode);
        }
        const mergedBuffer = await getAllTrackMergedBuffer();
        const source: AudioBufferSourceNode = audioCtx.createBufferSource();
        source.buffer = mergedBuffer;
        source.connect(audioCtx.destination);

        startTime = new Date().getTime();
        source.start(0, startOffset);
        clearInterval(timeStickInterval);
        timeStickInterval = setInterval(() => {
            moveStick();
        }, 50);
        currentCombinedSource = source;
        isPlaying = true;
        changePlayPause(true, null, isAdjust);
    }
}

function playTrackSound(selectedTrackNode: TrackNode, isAdjust = false) {
    if (isTrackPlaying && currentTrackNode) {
        // 이미 플레이중인 경우
        endTime = new Date().getTime();
        currentTrackNode.source?.stop();
        clearInterval(timeStickInterval);
        startOffset += (endTime - startTime) / 1000;
        isTrackPlaying = false;
        changePlayPause(false, currentTrackNode.trackKey, isAdjust);
        if (currentTrackNode.trackKey !== selectedTrackNode.trackKey) {
            // 특정 트랙이 실행 중일 때 다른 트랙 실행 버튼을 누른 경우
            playTrackSound(selectedTrackNode); // 다른 트랙을 클릭한 경우에는 기존의 사운드를 멈추고 새로운 트랙 실행
        }
    } else {
        if (isPlaying) {
            // 이미 통합 사운드가 실행 중일 경우
            play();
        }
        const source: AudioBufferSourceNode = audioCtx.createBufferSource();
        selectedTrackNode.setBufferSource(source);
        source.buffer = selectedTrackNode.audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0, startOffset);
        startTime = new Date().getTime();

        clearInterval(timeStickInterval); // 이전에 있던 interval이 있을 수 있으므로 지움 ( 겹치면 timeStick의 이동 속도가 빨라져 버림)
        timeStickInterval = setInterval(() => {
            moveStick();
        }, 50);
        currentTrackNode = selectedTrackNode; // 현재 재생 중인 source를 전역변수로 저장
        isTrackPlaying = true;
        changePlayPause(true, selectedTrackNode.trackKey, isAdjust);
    }
}

function changePlayPause(toPlay, trackKey, isAdjust = false) {
    if (isAdjust) {
        return;
    } // startOffset을 클릭해서 조정할 때에는 무시
    if (trackKey) {
        const trackPlayButton = document.querySelector(
            "#track_option ." + trackKey
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
async function adjustStartOffset(currentPlayTime: number) {
    if (isTrackPlaying && currentTrackNode) {
        const trackNode = trackSourceStore.get(currentTrackNode.trackKey);
        if (trackNode) {
            playTrackSound(trackNode, true); // playTrackSound()를 수행하기 위해서는 Track에 대한 sourceNode 객체가 필요
            startOffset = currentPlayTime;
            playTrackSound(trackNode, true); // playTrackSound()를 수행하기 위해서는 Track에 대한 sourceNode 객체가 필요
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
    let maxLength = 0;
    for (const source of trackSourceStore.values()) {
        // maxLength를 구함
        if (source) {
            maxLength = Math.max(maxLength, source.length);
        }
    }
    return maxLength === 0
        ? null
        : await mergeSources(maxLength, trackSourceStore.values(), true);
}

/**
 * Merge all sources of track of passed number and create new SourceNode object to reset trackSourceStore's value
 * */
async function mergeTrackSources(trackNumber) {
    const trackSourceList: SourceNode[] = [];
    for (const source of sourceStore.values()) {
        // track에 해당하는 source들을 골라 따로 배열을 만들어 둠
        if (source.trackNumber === trackNumber) {
            trackSourceList.push(source);
        }
    }
    const maxLength = calculateTotalDuration(trackNumber) * sampleRate; // length 는 duration에 sampleRate를 곱한 값과 일치함
    const mergedBuffer =
        maxLength === 0 ? null : await mergeSources(maxLength, trackSourceList);
    const source = audioCtx.createBufferSource();
    const newTrack = new TrackNode(trackNumber, mergedBuffer);
    source.buffer = mergedBuffer;
    newTrack.setBufferSource(source);
    newTrack.setGainValue(1);
    trackSourceStore.set(newTrack.trackKey, newTrack);
}

function calculateTotalDuration(trackNumber) {
    let maxDuration = 0;
    let totalSilenceTime = 0;
    const trackSourceList: SourceNode[] = [];
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

async function mergeSources(maxLength, sources, isAllTrack = false) {
    const offlineCtx = new OfflineAudioContext(
        numberOfChannels,
        maxLength,
        sampleRate
    );
    for (const node of sources) {
        if (node) {
            const source = offlineCtx.createBufferSource();
            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = isAllTrack ? 1 : node.gainValue;
            source.buffer = node.audioBuffer;
            source.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            source.start(node.startTime); // The information of function "start()" : Schedules(예약하다) playback of the audio data contained in the buffer, or begins playback immediately. Additionally allows the start offset and play duration to be set.
        }
    }

    const renderBuffer = await offlineCtx.startRendering();
    return renderBuffer;
}

/**
 * Cutting Sound Function
 */
async function cutSound(
    sourceNode: SourceNode,
    cutTime: number,
    leftRemove = false,
    rightRemove = false,
    needMerge = true
) {
    // 원본 audioBuffer가 없을 경우 return
    if (!sourceNode.audioBuffer) return;

    const waves: HTMLCanvasElement[] = [];
    const originAudioBuffer: AudioBuffer = sourceNode.audioBuffer;
    const cutFrame = (cutTime - sourceNode.startTime) * sampleRate;
    let leftSourceNode: SourceNode | null = null;
    let rightSourceNode: SourceNode | null = null;

    // 자르는 구간이 양끝과 딱 일치하는 경우 cutFrame이 0이 되거나  자를 게 없는 경우가 생김. 그런 경우를 방지.
    if (
        cutFrame <= 0 ||
        originAudioBuffer.getChannelData(0).length - cutFrame < 1
    )
        return;

    // 기존의 waveBar 및 selectedBar 지우기
    if (needMerge) {
        // 작업을 수행하기 전에 undo list에 추가
        pushStore(undoSourceList, sourceStore);
        pushStore(undoTrackList, trackSourceStore);
        clearRedoList();
        document.getElementById("selected_bar")?.remove(); // cover를 통해 cutSound가 이루어지는 경우 selected bar를 유지
    }
    document.getElementById(sourceNode.sourceKey)?.remove();
    sourceStore.delete(sourceNode.sourceKey);

    if (!leftRemove) {
        const leftAudioBuffer = separateSound(originAudioBuffer, 0, cutFrame);
        leftSourceNode = new SourceNode(
            ++waveIndex,
            sourceNode.trackNumber,
            leftAudioBuffer
        );
        leftSourceNode.setStartTime(sourceNode.startTime);
        leftSourceNode.resetEndTime();
        leftSourceNode.setGainValue(sourceNode.gainValue);
        sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);
        waves.push(
            createWaveBar(leftSourceNode.index, leftSourceNode.trackNumber)
        );
    }

    if (!rightRemove) {
        const rightAudioBuffer = separateSound(
            originAudioBuffer,
            cutFrame,
            undefined
        );
        rightSourceNode = new SourceNode(
            ++waveIndex,
            sourceNode.trackNumber,
            rightAudioBuffer
        );
        rightSourceNode.setStartTime(cutTime);
        rightSourceNode.resetEndTime();
        rightSourceNode.setGainValue(sourceNode.gainValue);
        sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);
        waves.push(
            createWaveBar(rightSourceNode.index, rightSourceNode.trackNumber)
        );
    }

    if (needMerge) {
        removeAllSelected();
        await mergeTrackSources(sourceNode.trackNumber);
    }
    drawWave(waves, sourceNode.trackKey);
}

async function coverSource(
    sourceNode: SourceNode,
    firstCutTime: number,
    secondCutTime: number
) {
    // 원본 audioBuffer가 없을 경우 return
    if (!sourceNode.audioBuffer) return;

    const waveBox = document.querySelector(`#${sourceNode.trackKey} .wave_box`);
    const originAudioBuffer: AudioBuffer = sourceNode.audioBuffer;
    const firstCutFrame = (firstCutTime - sourceNode.startTime) * sampleRate;
    const secondCutFrame = (secondCutTime - sourceNode.startTime) * sampleRate;
    let leftSourceNode: SourceNode | null = null;
    let rightSourceNode: SourceNode | null = null;

    // 기존의 waveBar 지우기
    document.getElementById(sourceNode.sourceKey)?.remove();
    sourceStore.delete(sourceNode.sourceKey);

    for (let i = 0; i < 2; i++) {
        switch (i) {
            case 0: {
                const leftAudioBuffer = separateSound(
                    originAudioBuffer,
                    0,
                    firstCutFrame
                );
                leftSourceNode = new SourceNode(
                    ++waveIndex,
                    sourceNode.trackNumber,
                    leftAudioBuffer
                );
                leftSourceNode.setStartTime(sourceNode.startTime);
                leftSourceNode.resetEndTime();
                leftSourceNode.setGainValue(sourceNode.gainValue);
                sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);

                const leftWave = createWaveBar(
                    leftSourceNode.index,
                    leftSourceNode.trackNumber
                );
                waveBox?.appendChild(leftWave);
                break;
            }
            case 1: {
                const rightAudioBuffer = separateSound(
                    originAudioBuffer,
                    secondCutFrame,
                    undefined
                );
                rightSourceNode = new SourceNode(
                    ++waveIndex,
                    sourceNode.trackNumber,
                    rightAudioBuffer
                );
                rightSourceNode.setStartTime(secondCutTime);
                rightSourceNode.resetEndTime();
                rightSourceNode.setGainValue(sourceNode.gainValue);
                sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);

                const rightWave = createWaveBar(
                    rightSourceNode.index,
                    rightSourceNode.trackNumber
                );
                waveBox?.appendChild(rightWave);
                break;
            }
        }
    }
    drawAllWave();
}

function separateSound(
    originAudioBuffer: AudioBuffer,
    startFrame: number,
    endFrame: number | undefined
) {
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
async function undo() {
    if (undoSourceList.length <= 0 || undoTrackList.length <= 0) {
        return;
    }
    const currentPlayTime = getCurrentPlayTime();

    pushStore(redoSourceList, sourceStore);
    pushStore(redoTrackList, trackSourceStore);
    const tempPoppedSourceMap = undoSourceList.pop();
    const tempPoppedTrackMap = undoTrackList.pop();
    if (tempPoppedSourceMap) sourceStore = tempPoppedSourceMap;
    if (tempPoppedTrackMap) trackSourceStore = tempPoppedTrackMap;
    recreateAllElement();
    document.getElementById("selected_bar")?.remove();
    await adjustStartOffset(currentPlayTime);
}

async function redo() {
    if (redoSourceList.length <= 0) {
        return;
    }
    const currentPlayTime = getCurrentPlayTime();

    pushStore(undoSourceList, sourceStore);
    pushStore(undoTrackList, trackSourceStore);
    const tempPoppedSourceMap = redoSourceList.pop();
    const tempPoppedTrackMap = redoTrackList.pop();
    if (tempPoppedSourceMap) sourceStore = tempPoppedSourceMap;
    if (tempPoppedTrackMap) trackSourceStore = tempPoppedTrackMap;
    recreateAllElement();
    document.getElementById("selected_bar")?.remove();
    await adjustStartOffset(currentPlayTime);
}

function pushStore(array: Map<string, any>[], store: Map<string, any>) {
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
    return (parseFloat(timeStick!.style.left) - stickStartOffset) / widthRatio;
}

function recreateAllElement() {
    removeAllElement();
    for (const track of trackSourceStore.values()) {
        createSoundbar(track.trackNumber);
        const waveBox = document.getElementById(track.trackKey);
        for (const source of sourceStore.values()) {
            if (track.trackKey === source.trackKey) {
                const waveBar = createWaveBar(source.index, source.trackNumber);
                waveBox?.appendChild(waveBar);
            }
        }
    }
    drawAllWave();
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
                        const arrayBuffer: ArrayBuffer | string | null =
                            fileReader.result;
                        if (arrayBuffer instanceof ArrayBuffer) {
                            const audioBuffer = await audioCtx.decodeAudioData(
                                arrayBuffer
                            ); // 이 메소드는 MP3와 WAV, webm 등의 확장자에만 가능하다는 듯 하다.
                            waveIndex++;
                            trackNumber++;
                            const sourceNode = new SourceNode(
                                waveIndex,
                                trackNumber,
                                audioBuffer
                            );
                            sourceStore.set("source" + waveIndex, sourceNode);
                            await mergeTrackSources(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기

                            // 파일 하나당 트랙추가
                            createSoundbar(trackNumber);
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
    recorder?.stop();
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
    const channels: any[] = [];
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
    for (const trackNode of trackSourceStore.values()) {
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
function copyToSameNode(node: TrackNode | SourceNode) {
    let result: SourceNode | TrackNode | null = null;
    if (node instanceof SourceNode) {
        result = new SourceNode(node.index, node.trackNumber, node.audioBuffer);
        result.setStartTime(node.startTime);
        result.resetEndTime();
        result.setGainValue(node.gainValue);
    } else if (node instanceof TrackNode) {
        result = new TrackNode(node.trackNumber, node.audioBuffer);
        result.setStartTime(node.startTime);
        result.resetEndTime();
        result.setGainValue(node.gainValue);
    }
    return result;
}

function copyToNewNode(node: TrackNode | SourceNode) {
    let result: SourceNode | TrackNode | null = null;
    if (node instanceof SourceNode) {
        result = new SourceNode(
            ++waveIndex,
            node.trackNumber,
            node.audioBuffer
        );
        result.setStartTime(node.startTime);
        result.resetEndTime();
        result.setGainValue(node.gainValue);
    } else if (node instanceof TrackNode) {
        result = new TrackNode(node.trackNumber, node.audioBuffer);
        result.setStartTime(node.startTime);
        result.resetEndTime();
        result.setGainValue(node.gainValue);
    }
    return result;
}
