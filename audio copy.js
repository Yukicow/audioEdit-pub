

// // AudioContext
// export default audioCtx = new AudioContext({sampleRate: 48000});

// // 인덱스 관련 옵션
// let trackNumber = 0;
// let waveIndex = 0;
// let fileIndex = 0;


// // play 관련 옵션
// let isPlaying = false;
// let isTrackPlaying = false;
// let currentTrackNode = null;
// let currentCombinedSource = null;
// let startOffset = 0;
// let startTime = 0;
// let endTime = 0


// // recording option
// let recorder = null;
// const recordedData = [];

// // soundbar 길이 조정
// const defaultMinWidth = 1500;
// const limitPlayDuration = 900; // 타임라인은 최대 15분까지
// let widthRatio = 5; // 초당 5px
// let trackWidth = defaultMinWidth;
// let maxPlayDuration = 1500 / widthRatio;

// const numberOfChannels = 2;
// const sampleRate = 48000;
// let sourceStore = new Map(); // 모든 개별 SourceNode를 저장
// let trackSourceStore = new Map(); // 트랙에 포함된 모든 source를 묶어 새 source를 만들고, 그 source로 생성된 SourceNode를 저장
// let originSourceStore = new Map(); // sound 원본을 저장해 놓음

// // Drag Move Option
// let isDragging = false;
// let dragStartX = 0;
// let previousDragX = 0;
// let dragStartSelectedBarLeft = 0

// // Drag Select option
// const currentSelectedSourceList = new Set();
// let currentSelectedSourceNode = null;
// let currentSelectedTrack = null;
// let selectedBarStart = 0;
// let selectedBarEnd = 0;
// let dragAreaStartX = 0;
// let dragAreaStartY = 0;


// // Copy option
// let currentCopiedSourceList = new Set();



// // Undo Redo Option
// const undoSourceList = [];
// const undoTrackList = [];
// const redoSourceList = [];
// const redoTrackList = [];


// // OptionBar
// const playButton = document.getElementById("play_button");
// const initButton = document.getElementById("init_button");
// const createButton = document.getElementById("create_button");
// const ratioRange = document.getElementById("ratio");
// const cutButton = document.getElementById("cut_button");
// const deleteButton = document.getElementById("delete_button");
// const timeInput = document.getElementById("time_input");
// const timeAddButton = document.getElementById("time_add_button");
// const undoButton = document.getElementById("undo_button");
// const redoButton = document.getElementById("redo_button");
// const recordButton = document.getElementById("record_button");


// // FileWindow
// const fileInput = document.getElementById("file");
// const fileListBox = document.getElementById("file_list_box");

// // Edit Window
// let timeStickInterval = null;
// let timeStick = null;
// const editWindow = document.getElementById("edit_window");
// const editContainer = document.getElementById("edit_cont");
// const editBox = document.getElementById("edit_box");
// const trackContainer = document.getElementById("track_cont");
// const trackOption = document.getElementById("track_option");
// const timeLineBox = document.getElementById("time_line_box");
// const timeLine = document.getElementById("time_line");

// // stick의 시작 위치
// const stickStartOffset = 0 // timeLine.getBoundingClientRect().left - editBox.getBoundingClientRect().left (이 부분은 혹시 나중에 타임스틱이 특정 div에서 분리될 때 사용)



// // todo: 원본 붙여 넣기 기능 만들기

// init();

// /**
//  * Init Options
//  */
// function init() {
//     drawTimeLine(true);
//     drawStick(0);
//     document.addEventListener("contextmenu", (event) => {event.preventDefault()});

//     document.addEventListener("mousedown", (event) => {
//         if(event.target.id === "drag_box"){
//             removeAllSelected();
//         }
//         if(event.target.classList.contains("option")) return; // option에 해당하는 작업은 modal이나 select된 값들이 필요하므로 유지
//         document.getElementById("option_modal")?.remove();
//     });

//     document.addEventListener("keydown", function(event) {
//         if (event.ctrlKey && event.key === "c") {
//             if(currentSelectedSourceList.size === 0) {return;} 
//             else{
//                 currentCopiedSourceList.clear(); // Set을 한 번 초기화
//                 for (const source of currentSelectedSourceList.values()) {
//                     currentCopiedSourceList.add(source);
//                 } 
//             }
//         }
//     });

//     document.addEventListener("keydown", async function(event) {
//         if (event.ctrlKey && event.key === "v"){
//             if(currentSelectedTrack !== null){ await pasteSource() };
//         }
//     })
    
//     document.addEventListener("keydown", async function(event) {
//         if (event.ctrlKey && event.key === "x"){
//             event.stopPropagation();
//             if(currentSelectedSourceList.size !== 0){ await deleteSource() };
//         }
//     })
    
//     document.addEventListener("keydown", async function(event) {
//         if ( !event.ctrlKey && event.key === "x" ){
//             if(currentSelectedSourceList.size !== 0){ 
//                 const currentTime = getCurrentPlayTime();
//                 currentSelectedSourceList.forEach( (source) => { // 현재 지정된 시간이 선택된 wave 안에 없을 때에는 메소드를 종료
//                     if(currentTime >= source.startTime && currentTime <= source.endTime) { currentSelectedSourceNode = source } 
//                 })
//                 await cutSound(currentSelectedSourceNode, currentTime);
//             };
//         }
//     })

//     document.addEventListener("keydown", async function(event) {
//         if (event.ctrlKey && event.key === "z"){ await undo(); }
//     })
// }

// function removeAllSelected() {
//     document.getElementById("selected_bar")?.remove();
//     currentSelectedSourceNode = null;
//     currentSelectedSourceList.clear();
// }







// class BaseNode {

//     constructor(trackNumber, audioBuffer) {
//         this.trackNumber = trackNumber;
//         this.offset = 0;
//         this.audioBuffer = audioBuffer; 
//         this.gainValue = 1;
//         this.length = audioBuffer ? audioBuffer.length : 0;
//         this.duration = audioBuffer ? audioBuffer.duration : 0;
//         this.startTime = 0; // 트랙 내에서 이 소스가 시작하는 시간
//         this.endTime = this.startTime + this.duration; // 트랙 내에서 이 소스가 끝나는 시간  
//     }

//     setStartTime(startTime) {
//         this.startTime = startTime;
//     }

//     resetEndTime(){
//         this.endTime = this.startTime + this.duration;
//     }

//     resetTrackNumber(trackNumber){
//         this.trackNumber = trackNumber;
//         this.trackKey = "track" + trackNumber;
//     }

//     setGainValue(gainValue){
//         this.gainValue = gainValue;
//     }
// }

// class SourceNode extends BaseNode{

//     constructor(index, trackNumber, audioBuffer) {
//         super(trackNumber, audioBuffer);
//         this.index = index;
//         this.sourceKey = "source" + index;
//         this.trackKey = "track" + trackNumber;
//     }

// }

// class TrackNode extends BaseNode{

//     constructor(trackNumber, audioBuffer, gainNode) {
//         super(trackNumber, audioBuffer, gainNode);
//         this.trackKey = "track" + trackNumber;
//         this.source = null;
//     }

//     setBufferSource(source){
//         this.source = source;
//     }
// }


// class OriginSource {

//     constructor(fileIndex, fileName, audioBuffer) {
//         this.fileIndex = fileIndex
//         this.fileName = fileName;
//         this.audioBuffer = audioBuffer;
//         this.fileKey = `file${fileIndex}`
//     }
// }


// createButton.addEventListener("click", downloadMixedSound);
// timeLine.addEventListener("click", clickStartOffset);
// initButton.addEventListener("click", initPlayTime);
// undoButton.addEventListener("click", async () => {await undo()});
// redoButton.addEventListener("click", async () => {await redo()});
// recordButton.addEventListener("click", startRecording);

// playButton.addEventListener("click", () => {
//     checkPlayReady(play);
// });

// ratioRange.addEventListener("input", () => {
//     const beforeWidthRatio = widthRatio; // 기존의 widthRatio를 저장해 둠
//     const beforeChangePlayTime = getCurrentPlayTime(); // widthRatio를 변경하기 전에 playTime을 계산해 놓아야 함
//     widthRatio = ratioRange.value
//     drawTrack();
//     drawAllWave();
//     drawStick(beforeChangePlayTime);
//     drawTimeLine();
//     drawSelectedBar(beforeWidthRatio);
// })

// cutButton.addEventListener("click", async (event) => {
//     event.stopPropagation();

//     const currentTime = getCurrentPlayTime();
//     currentSelectedSourceList.forEach( (source) => { // 현재 지정된 시간이 선택된 wave 안에 없을 때에는 메소드를 종료
//         if(currentTime >= source.startTime && currentTime <= source.endTime) { currentSelectedSourceNode = source } 
//     })

//     if(currentSelectedSourceNode === null) return;
//     cutSound(currentSelectedSourceNode, currentTime);
//     await adjustStartOffset(currentTime);
// });

// deleteButton.addEventListener("click", deleteSource);

// async function deleteSource() {
//     document.getElementById("option_modal")?.remove();
//     pushStore(undoSourceList, sourceStore);
//     pushStore(undoTrackList, trackSourceStore);
//     clearRedoList();

//     let trackNumber = 0;
//     const currentTime = getCurrentPlayTime();
//     document.getElementById("selected_bar").remove();
//     currentSelectedSourceList.forEach( (source) =>{
//         document.getElementById(source.sourceKey).remove();
//         sourceStore.delete(source.sourceKey);
//         trackNumber = source.trackNumber;
//     });
//     await mergeTrackSources(trackNumber);
//     currentSelectedSourceList.clear();
//     await adjustStartOffset(currentTime);
// }

// timeAddButton.addEventListener("click", () => {
//     maxPlayDuration += parseInt(timeInput.value);
//     timeInput.value = 0;
//     drawTrack();
//     drawTimeLine();
// })



// async function initPlayTime() {
//     await adjustStartOffset(0);
//     drawStick();
// }

// fileInput.addEventListener("change", (event) => {
//     event.stopPropagation();
//     event.preventDefault();
//     if(!audioCtx) audioCtx = new AudioContext({sampleRate: 48000});

//     const file = event.target.files[0];
//     const fileReader = new FileReader();
//     const fileName = file.name;

//     fileReader.readAsArrayBuffer(file);    
//     fileReader.onload = async function() {
//         const arrayBuffer = fileReader.result;
//         const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer); // 이 메소드는 MP3와 WAV 확장자에만 가능하다는 듯 하다.
//         waveIndex++;
//         trackNumber++;
//         fileIndex++;
//         const sourceNode = new SourceNode(waveIndex, trackNumber, audioBuffer);
//         const originSource = new OriginSource(fileIndex, fileName, audioBuffer)
//         sourceStore.set("source" + waveIndex, sourceNode);
//         originSourceStore.set("file" + fileIndex, originSource);

//         await mergeTrackSources(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기

//         // 파일 하나당 트랙 및 웨이브 추가
//         createSoundbar(trackNumber);  
//         const wave = [createWaveBar(waveIndex, trackNumber)];
//         drawWave(wave, sourceNode.trackKey);

//         createOriginFile(originSource);

//         // 첨부파일 초기화
//         fileInput.files = new DataTransfer().files;
//     }
// })


// /**
//  * Create Element Function
//  */
// function createOriginFile(originSource) {
//     const fileShowerBox = document.createElement("div");
//     fileShowerBox.id = originSource.fileKey;
//     fileShowerBox.classList.add("file_shower_box");
//     fileShowerBox.addEventListener("contextmenu", () => {showOriginOption(originSource.fileKey)});

//     const imgShower = document.createElement("div");
//     imgShower.classList.add("img_shower");

//     const nameShower = document.createElement("div");
//     nameShower.classList.add("name_shower");
//     nameShower.innerText = originSource.fileName;

//     fileShowerBox.appendChild(imgShower);
//     fileShowerBox.appendChild(nameShower);
//     fileListBox.append(fileShowerBox);
// }

// function showOriginOption(fileKey) {
//     const optionModal = document.createElement("div");
//     const copyOrigin = document.createElement("div");

//     optionModal.id = "option_modal";
//     optionModal.style.left = event.pageX + "px";
//     optionModal.style.top = event.pageY - 10 + "px";

//     // Delete Element
//     copyOrigin.classList.add("option", "ind_option");
//     copyOrigin.innerText = "원본 복사하기";
//     copyOrigin.addEventListener("click", () => {
//         document.getElementById("option_modal")?.remove();
//         currentCopiedSourceList.clear();
//         const originAudioBuffer = originSourceStore.get(fileKey).audioBuffer;
//         const newSource = new SourceNode(++waveIndex, 0, originAudioBuffer);
//         currentCopiedSourceList.add(newSource);
//     });

//     optionModal.appendChild(copyOrigin);
//     document.body.appendChild(optionModal);
// }

// function createSoundbar(trackNumber) {
//     // 사운드가 플레이 되고 있을 때 파일을 추가하면 drawStick() 메소드에서 현재 시간을 필요로 함
//     const currentPlayTime = timeStick !== null ? getCurrentPlayTime() : 0;

//     const soundBox = document.createElement("div");
//     soundBox.id = "track" + trackNumber;
//     soundBox.classList.add("sound_box");

//     const waveBox = document.createElement("div");
//     waveBox.classList.add("wave_box", "track" + trackNumber);
//     waveBox.addEventListener("contextmenu", showTrackOption);
//     waveBox.addEventListener("mousedown", dragstart);
    
//     const dragBox = document.createElement("div");
//     dragBox.id = "drag_box";
//     dragBox.classList.add("track" + trackNumber);

//     const trackPlayButton = document.createElement("button");
//     trackPlayButton.classList.add("track" + trackNumber, "track_play_button");
//     trackPlayButton.innerText = "▶";
//     trackPlayButton.addEventListener("click", () => { 
//         const track = trackSourceStore.get("track" + trackNumber);
//         if(track) { playTrackSound(track); }
//     });

//     trackOption.appendChild(trackPlayButton);
//     soundBox.appendChild(waveBox);
//     waveBox.appendChild(dragBox);
//     trackContainer.appendChild(soundBox);

//     drawTrack();
//     drawTimeLine();
//     drawStick(currentPlayTime); // 이 메소드를 최초 한 번만 수행하는 형태로 고쳐도 됨
// }

// function createWaveBar(waveIndex, trackNumber) {
//     const waveBar = document.createElement("canvas");
//     const sourceKey = "source" + waveIndex;
//     const trackKey = "track" + trackNumber;
//     waveBar.id = sourceKey;
//     waveBar.classList.add(trackKey, "wave_bar");
//     waveBar.addEventListener("click", (event) => {
//         selectTrack(event.target.classList[0]);
//         selectWaveBar(event.target.id);
//     })
//     waveBar.addEventListener("contextmenu", showTrackOption);
//     return waveBar;
// }

// function selectWaveBar(sourceKey) {
//     document.getElementById("selected_bar")?.remove;
//     currentSelectedSourceList.clear();
//     const source = sourceStore.get(sourceKey);
//     currentSelectedSourceList.add(source);
//     selectedBarStart = source.startTime;
//     selectedBarEnd = source.endTime;
//     createSelectedBar(source.trackKey, source.sourceKey);
// }

// function createSelectedBar(trackKey, sourceKey = "none") {
//     document.getElementById("selected_bar")?.remove();
//     const waveBox = document.querySelector(`#${trackKey} .wave_box`);
//     const selectedBar = document.createElement("div");
//     selectedBar.addEventListener("contextmenu", showWaveOption);
//     selectedBar.addEventListener("mousedown", dragInit);
//     selectedBar.id = "selected_bar";
//     selectedBar.classList.add(trackKey, sourceKey); // 첫 번째 클래스가 trackKey
//     selectedBar.style.width = `${(selectedBarEnd - selectedBarStart) * widthRatio}px`;
//     selectedBar.style.left = `${selectedBarStart * widthRatio}px`;
//     waveBox.appendChild(selectedBar);
// }



// /**
//  * Show Option Function
//  */
// function showWaveOption(event) {
//     event.preventDefault();
//     event.stopPropagation();
//     document.getElementById("option_modal")?.remove();

//     const sourceKey = event.target.classList[1];
//     const source = sourceStore.get(sourceKey);

//     const optionModal = document.createElement("div");
//     const copy = document.createElement("div");
//     const sourcePaste = document.createElement("div");
//     const sourceDelete = document.createElement("div");

//     optionModal.id = "option_modal";
//     optionModal.style.left = event.pageX + "px";
//     optionModal.style.top = event.pageY - 10 + "px";

//     // GainInput Element
//     if(sourceKey !== "none"){
//         const wrapBox = document.createElement("div");
//         const gainInput = document.createElement("input");
//         wrapBox.classList.add("option", "ind_option");
//         gainInput.classList.add("option");
//         gainInput.setAttribute("type", "range");
//         gainInput.setAttribute("min", "0");
//         gainInput.setAttribute("max", "2");
//         gainInput.setAttribute("step", "0.05");
//         gainInput.setAttribute("value", source.gainValue);
//         gainInput.addEventListener("change", async () => {
//             source.setGainValue(parseFloat(gainInput.value));
//             await mergeTrackSources(source.trackNumber);
//             await adjustStartOffset(getCurrentPlayTime());
//             const waves = [document.getElementById(source.sourceKey)]; // drawWave가 waveBar배열을 인자로 받기 때문에 번거롭지만 이렇게 해야 함
//             drawWave(waves, source.trackKey);
//         });
//         wrapBox.appendChild(gainInput);
//         optionModal.appendChild(wrapBox);
//     }

//     // Copy Element
//     copy.classList.add("option", "ind_option");
//     copy.innerText = "복사하기";
//     copy.addEventListener("click", () => {
//         currentCopiedSourceList.clear();
//         for (const source of currentSelectedSourceList.values()) {
//             document.getElementById("option_modal")?.remove();
//             currentCopiedSourceList.add(source)
//         } 
//     });

//     // Paste Element
//     sourcePaste.classList.add("option", "ind_option");
//     sourcePaste.innerText = "붙여넣기";
//     sourcePaste.addEventListener("click", pasteSource);

//     // Delete Element
//     sourceDelete.classList.add("option", "ind_option");
//     sourceDelete.innerText = "제거하기";
//     sourceDelete.addEventListener("click", deleteSource);
    
//     optionModal.appendChild(copy);
//     optionModal.appendChild(sourcePaste);
//     optionModal.appendChild(sourceDelete);
//     document.body.appendChild(optionModal);
// }

// function showTrackOption(event) {
//     event.preventDefault();
//     event.stopPropagation();
//     document.getElementById("option_modal")?.remove();
//     removeAllSelected();
//     const trackKey = event.target.classList[0];
//     selectTrack(trackKey);

//     const optionModal = document.createElement("div");
//     const trackDelete = document.createElement("div");
//     const sourcePaste = document.createElement("div");

//     optionModal.id = "option_modal";
//     optionModal.style.left = event.pageX + "px";
//     optionModal.style.top = event.pageY - 10 + "px";

//     // Delete Element
//     trackDelete.classList.add("option", "ind_option");
//     trackDelete.innerText = "트랙 지우기";
//     trackDelete.addEventListener("click", () => {deleteTrack(trackKey)})

//     // Paste Element
//     sourcePaste.classList.add("option", "ind_option");
//     sourcePaste.innerText = "붙여넣기";
//     sourcePaste.addEventListener("click", pasteSource);

//     optionModal.appendChild(trackDelete);
//     optionModal.appendChild(sourcePaste);
//     document.body.appendChild(optionModal);
// }


// /**
//  * Doing Option Function
//  */
// async function deleteTrack(trackKey) {
//     pushStore(undoSourceList, sourceStore);
//     pushStore(undoTrackList, trackSourceStore);

//     document.getElementById("option_modal")?.remove();
//     document.getElementById(trackKey).remove();
//     document.querySelector(`#track_option .${trackKey}`).remove();
//     trackSourceStore.delete(trackKey);
//     for (const source of sourceStore.values()) {
//         if(source.trackKey === trackKey){
//             sourceStore.delete(source.sourceKey);
//         }
//     }
    
//     if(isTrackPlaying){
//         playTrackSound(currentTrackNode);
//     }else if(isPlaying){
//         play();
//     }

//     const currentPlayTime = getCurrentPlayTime();
//     adjustStartOffset(currentPlayTime);
//     drawStick(currentPlayTime);
// }


// async function pasteSource() {
//     document.getElementById("option_modal")?.remove();
//     if(currentCopiedSourceList.size === 0) return;
//     pushStore(undoSourceList, sourceStore);
//     pushStore(undoTrackList, trackSourceStore);

//     const copiedSourceArray = [];
//     const waves = [];
//     const trackKey = currentSelectedTrack.id;
//     const trackNumber = parseInt(trackKey.slice(5,6)); // 이거 parse 안 해서 문제 될 뻔
//     const currentPlayTime = getCurrentPlayTime()
//     const waveBox = document.querySelector(`#${trackKey} .wave_box`);
//     let startTime = currentPlayTime;
//     let minStartTime = currentPlayTime;
//     let maxEndTime = 0;

//     currentCopiedSourceList.forEach( (source) => {
//         const copiedSource = copyToNewNode(source);
//         sourceStore.set(copiedSource.sourceKey, copiedSource);
//         copiedSourceArray.push(copiedSource);
//     })

//     copiedSourceArray.sort( function(a, b){
//         return a.startTime - b.startTime;
//     })

//     // 선택된 source가 있고 같은 트랙일 경우 경우 그 source의 endTime에 이어서 붙이도록 하기 위한 startTime 초기화 과정
//     if(currentSelectedSourceList.size !== 0){
//         let tempStartTime = 0;
//         for (const source of currentSelectedSourceList.values()) {
//             tempStartTime = Math.max(source.endTime, tempStartTime);
//         }
//         startTime = tempStartTime;
//         minStartTime = tempStartTime;
//     }
//     removeAllSelected(); // coverSound()를 호출할 때 currentSelectedSourceList가 영향을 주기 때문에 초기화 과정을 거침

//     // 복사한 source들의 위치를 조정하고 waveBar를 생성
//     for (let i = 0; i < copiedSourceArray.length; i++) {
//         const sourceNode = copiedSourceArray[i]
//         sourceNode.startTime = startTime;
//         sourceNode.resetEndTime();
//         sourceNode.resetTrackNumber(trackNumber);
//         currentSelectedSourceList.add(sourceNode);
//         startTime += sourceNode.duration;
//         maxEndTime = Math.max(maxEndTime, sourceNode.endTime);
//         const waveBar = createWaveBar(sourceNode.index, sourceNode.trackNumber);
//         waves.push(waveBar);
//     }

//     await coverSound(minStartTime, maxEndTime, trackKey);
//     await mergeTrackSources(trackNumber);
//     await adjustStartOffset(currentPlayTime);
//     drawTrack();
//     drawTimeLine();
//     drawWave(waves, trackKey);

//     // 복사된 source들이 선택되도록 만들기
//     selectedBarStart = minStartTime;
//     selectedBarEnd = maxEndTime;
//     createSelectedBar(trackKey);
// }



// /**
//  * Drag And Select Function
//  */
// function dragstart(event) {
//     event.preventDefault();
//     // event.stopPropagation();
//     if(event.button === 2 || event.target.id !== "drag_box") return;
//     removeAllSelected();

//     const trackKey = event.target.classList[0]
//     const soundBox = document.getElementById(trackKey);
//     selectTrack(trackKey);

//     dragAreaStartX = event.offsetX;
//     dragAreaStartY = event.offsetY;

//     const dragArea = document.createElement("div");
//     dragArea.id = "drag_area";
//     dragArea.classList.add(trackKey);
//     dragArea.style.left = `${dragAreaStartX}px`
//     dragArea.style.top = `${dragAreaStartY}px`

//     const dragSpace = document.createElement("div");
//     dragSpace.id = "drag_space";
//     dragSpace.classList.add(trackKey);
//     dragSpace.style.zIndex = 99;
//     dragSpace.style.width = trackWidth + "px";

//     soundBox.prepend(dragArea);
//     soundBox.prepend(dragSpace);

//     document.addEventListener("mousemove", moveDragArea);
//     dragSpace.addEventListener("mouseup", selectAreaElements);
//     dragSpace.addEventListener("mouseleave", selectAreaElements);
// }

// function selectTrack(trackKey) {
//     const soundBox = document.getElementById(trackKey);
//     if(currentSelectedTrack){currentSelectedTrack.classList.remove("selected");} 
//     soundBox.classList.add("selected");
//     currentSelectedTrack = soundBox;
// }

// function moveDragArea(event) {
//     event.preventDefault();
//     event.stopPropagation();

//     const dragArea = document.getElementById("drag_area");
//     const x = event.offsetX;
//     const y = event.offsetY;

//     //마우스 이동에 따라 선택 영역을 리사이징 한다
//     const width = Math.max(x - dragAreaStartX, dragAreaStartX - x);
//     const left = Math.min(dragAreaStartX, x);
//     dragArea.style.width = `${width}px`
//     dragArea.style.left = `${left}px`

//     const height = Math.max(y - dragAreaStartY, dragAreaStartY - y);
//     const top = Math.min(dragAreaStartY, y);
//     dragArea.style.height = `${height}px`
//     dragArea.style.top = `${top}px`
// }

// function selectAreaElements(event) {
//     const dragArea = document.getElementById("drag_area");
//     const trackKey = dragArea.classList[0];
//     const dragWidth = parseFloat(dragArea.style.width) ? parseFloat(dragArea.style.width) : 0;
//     areaStart = parseFloat(dragArea.style.left); // 드래그 영역의 맨 왼쪽 지점
//     areaEnd = areaStart + dragWidth; // 드래그 영역의 맨 오른쪽 지점
//     removeAllDragAreaEvent();
    
//     let tempStart = 999999;
//     let tempEnd = 0;
//     for (const source of sourceStore.values()) {
//         //같은 트랙에 있는 source에 대해서만 수행
//         if(source.trackKey === trackKey){ 
//             const sourceStart = source.startTime * widthRatio; // source의 waveBar left값
//             const sourceEnd = source.endTime * widthRatio; // source의 끝 위치
           
//             // 드래그 영역에 포함되는 source를 추가
//             if(!(sourceStart > areaEnd || sourceEnd < areaStart)){ 
//                 currentSelectedSourceList.add(source);
//                 tempStart = Math.min(tempStart, source.startTime);
//                 tempEnd = Math.max(tempEnd, source.endTime);
//             }
//         }  
//     }

//     if(!(currentSelectedSourceList.size === 0)) {
//         selectedBarStart = tempStart;
//         selectedBarEnd = tempEnd;
//         if(currentSelectedSourceList.size === 1) { // 드래그 된 값이 하나일 경우 사운드 조절이 가능하게 하기 위한 작업
//             currentSelectedSourceList.forEach( (source) => createSelectedBar(trackKey, source.sourceKey) ); 
//         }else{
//             createSelectedBar(trackKey);
//         }
//     }
// }


// function removeAllDragAreaEvent() {
//     document.removeEventListener("mousemove", moveDragArea);
//     document.getElementById("drag_space").remove();
//     document.getElementById("drag_area").remove();
// }




// /**
//  * Move WaveBar Function
//  */
// function dragInit(event){
//     event.preventDefault();
//     if(event.button === 2) return;
//     document.addEventListener("mousemove", moveMultiSelectedBar);
//     document.addEventListener("mouseup", moveWaveBar);

//     dragStartX = event.clientX;
//     previousDragX = event.clientX;
//     dragStartSelectedBarLeft = parseFloat(document.getElementById("selected_bar").style.left);

//     const trackKey = event.target.classList[0];
//     const dragBoxes = document.querySelectorAll("#drag_box");
//     dragBoxes.forEach( (dragBox) => {
//         if(dragBox.classList[0] !== trackKey){
//             dragBox.style.zIndex = 3;
//             dragBox.addEventListener("mouseenter" , moveToAnotherTrack);
//         }
//     });
// }

// /* function moveSelectedBar(event) {
//     event.preventDefault();
//     event.stopPropagation();
//     const selectedBar = document.getElementById("selected_bar");
//     const selectedBarWidth = parseFloat(selectedBar.style.width);
//     const trackKey = selectedBar.classList[0];
//     const sourceKey = selectedBar.classList[1];
//     const left = parseFloat(selectedBar.style.left); // 움직이기 이전 위치
//     const movedX = previousDragX - event.clientX; // 움직인 거리
//     const newLeft = left - movedX; // 고정될 위치이자 startTime의 시작 지점
//     const endTimeOffset = newLeft + selectedBarWidth; // 끝나는 지점
//     let stickLeft = false; // 다른 waveBar의 양 끝 지점에 가까워 붙이는 지
//     let stickLeftOffset = 0;


//     // 다른 waveBar의 양 끝 지점에 가까울 경우 붙이도록 하는 로직
//     for (const source of sourceStore.values()) {
//         if(source.trackKey === trackKey && source.sourceKey !== sourceKey){
//             const waveBar = document.getElementById(source.sourceKey);
//             const waveBarStart = parseFloat(waveBar.style.left);
//             const waveBarEnd = parseFloat(waveBar.style.left) + parseFloat(waveBar.style.width);
//             if(Math.abs(waveBarStart - endTimeOffset) < 15){ 
//                 stickLeft = true; 
//                 stickLeftOffset = waveBarStart - selectedBarWidth;
//             }else if(Math.abs(waveBarEnd - newLeft) < 15){
//                 stickLeft = true; 
//                 stickLeftOffset = waveBarEnd;
//             }
//         }
//     }

//     if(newLeft < 0)
//         selectedBar.style.left = "0px";
//     else if((newLeft + selectedBarWidth) >= trackWidth)
//         selectedBar.style.left = (trackWidth - selectedBarWidth) + "px";
//     else if(stickLeft){
//         selectedBar.style.left = stickLeftOffset + "px";
//     }else
//         selectedBar.style.left = newLeft + "px";

//     if(!stickLeft) previousDragX = event.clientX;
// } */

// function moveMultiSelectedBar(event) {
//     event.preventDefault();
//     const selectedBar = document.getElementById("selected_bar");
//     const trackKey = selectedBar.classList[0];
//     const sourceKeyList = new Set();
//     const selectedBarWidth = parseFloat(selectedBar.style.width);
//     const selectedBarLeft = parseFloat(selectedBar.style.left);
//     const movedX = previousDragX - event.clientX; // 움직인 거리
//     let stickLeft = false; // 다른 waveBar의 양 끝 지점에 가까워 붙이는 지
//     let stickLeftOffset = 0;

//     currentSelectedSourceList.forEach( (source) => {
//         sourceKeyList.add(source.sourceKey);
//     })
    
//     const newLeft = selectedBarLeft - movedX //고정될 위치이자 startTime의 시작 지점
//     const endTimeOffset = newLeft + selectedBarWidth  //끝나는 지점

//     // 다른 waveBar의 양 끝 지점에 가까울 경우 붙이도록 하는 로직
//     for (const source of sourceStore.values()) {
//         if(source.trackKey === trackKey && !sourceKeyList.has(source.sourceKey) ){ // 같은 트랙이면서 선택된 sound가 아닌 것
//             const waveBar = document.getElementById(source.sourceKey);
//             const waveBarStart = parseFloat(waveBar.style.left);
//             const waveBarEnd = parseFloat(waveBar.style.left) + parseFloat(waveBar.style.width);
//             if(Math.abs(waveBarStart - endTimeOffset) < 15){ 
//                 stickLeft = true; 
//                 stickLeftOffset = waveBarStart - selectedBarWidth;
//             }else if(Math.abs(waveBarEnd - newLeft) < 15){
//                 stickLeft = true; 
//                 stickLeftOffset = waveBarEnd;
//             }
//         }
//     }

//     if(newLeft < 0)
//         selectedBar.style.left = "0px";
//     else if((newLeft + selectedBarWidth) >= trackWidth)
//         selectedBar.style.left = `${trackWidth - selectedBarWidth}px`;
//     else if(stickLeft){
//         selectedBar.style.left = `${stickLeftOffset}px`;
//     }else
//         selectedBar.style.left = `${newLeft}px`;

//     if(!stickLeft) previousDragX = event.clientX;
// }

// function moveToAnotherTrack(event) {
//     if(event.target !== this){return;}
//     removeDragBoxEvent();
//     const trackKey = event.target.classList[0]; // dragBox(event.target)의 클래스 중 trackKey부분 추출
//     const selectedBar = document.getElementById("selected_bar");
//     const waveBox = document.querySelector("#" + trackKey + " .wave_box");
//     waveBox.appendChild(selectedBar);
//     selectedBar.classList.replace(selectedBar.classList[0], trackKey);

//     const dragBoxes = document.querySelectorAll("#drag_box");
//     dragBoxes.forEach( (dragBox) => {
//         if(dragBox.classList[0] !== trackKey){
//             dragBox.style.zIndex = 3;
//             dragBox.addEventListener("mouseenter" , moveToAnotherTrack);
//         }
//     });
// }

// async function moveWaveBar() {
//     removeDragBoxEvent();
//     pushStore(undoSourceList, sourceStore);
//     pushStore(undoTrackList, trackSourceStore);
//     clearRedoList();
//     document.removeEventListener("mousemove", moveMultiSelectedBar);
//     document.removeEventListener("mouseup", moveWaveBar);

//     const selectedBar = document.getElementById("selected_bar");
//     const trackKey = selectedBar.classList[0];
//     const waveBox = document.querySelector(`#${trackKey} .wave_box`);
//     const trackNumber = parseInt(trackKey.slice(5,6));
//     const currentTime = getCurrentPlayTime();
//     const selectedBarLeft = parseFloat(selectedBar.style.left);
//     const selectedBarWidth = parseFloat(selectedBar.style.width);
//     const moveAmount = selectedBarLeft - dragStartSelectedBarLeft; // 이동해야 하는 거리 
//     const moveTime = moveAmount / widthRatio // 이동해야 하는 시간
//     selectTrack(trackKey);

//     currentSelectedSourceList.forEach( (source) => {
//         const waveBar = document.getElementById(source.sourceKey);
//         const startTime = source.startTime + moveTime > 0 ? source.startTime + moveTime : 0;
//         waveBar.style.left = parseFloat(waveBar.style.left) + moveAmount + "px"; // 기존의 left에 움직인 거리만큼 더함
//         waveBar.classList.replace(waveBar.classList[0], trackKey);
//         source.setStartTime(startTime);
//         source.resetEndTime();
//         source.resetTrackNumber(trackNumber);
//         waveBox.appendChild(waveBar);
//     })
    
//     const minStartTime = selectedBarLeft / widthRatio;
//     const maxEndTime = ( selectedBarWidth + selectedBarLeft ) / widthRatio;
//     await coverSound(minStartTime, maxEndTime, trackKey);

//     for (const track of trackSourceStore.values()) {
//         await mergeTrackSources(track.trackNumber);
//     } 

//     await adjustStartOffset(currentTime);
// }

// async function coverSound(minStartTime, maxEndTime, trackKey) {
//     const trackSources = [];
//     const middleSources = []; // 완전히 사라져버릴 애들
//     let biggerSource = null; // 더 커서 쪼개질 애
//     let leftSource = null; // 잘려서 왼쪽에 남을 애
//     let rightSource = null; // 잘려서 오른쪽에 남을 애

//     for (const source of sourceStore.values()) { // 현재 선택된 source들을 제외한 모든 source
//         if(!(currentSelectedSourceList.has(source)) && source.trackKey === trackKey){ trackSources.push(source); }
//     }

//     // 덮어 씌우려는 sound를 기준으로 덮어씌워지는 sound들이 있는 지 확인 후 있다면 저장
//     for (const source of trackSources) {
//         if(minStartTime > source.startTime && maxEndTime < source.endTime){
//             biggerSource = source;
//             break;
//         }else if(minStartTime > source.startTime && minStartTime < source.endTime && maxEndTime >= source.endTime){
//             leftSource = source;
//         }else if(minStartTime <= source.startTime && maxEndTime >= source.startTime && maxEndTime < source.endTime){
//             rightSource = source;
//         }else if(minStartTime <= source.startTime && maxEndTime >= source.endTime){
//             middleSources.push(source);
//         }
//     }

//     if(biggerSource){
//         await coverSource(biggerSource, minStartTime, maxEndTime);
//     }else{
//         if(leftSource) await cutSound(leftSource, minStartTime, false, true, false);
//         if(rightSource) await cutSound(rightSource, maxEndTime, true, false, false);
//         if(middleSources) middleSources.forEach((source) => {
//             sourceStore.delete(source.sourceKey);
//             document.getElementById(source.sourceKey)?.remove();
//         });
//     }
// }
 
// function removeDragBoxEvent() {
//     const dragBoxes = document.querySelectorAll("#drag_box");
//     dragBoxes.forEach( (dragBox) => {
//         dragBox.style.zIndex = 0;
//         dragBox.removeEventListener("mouseenter", moveToAnotherTrack);
//     });
// }


// /**
//  * Drawing Function
//  */
// function drawTrack() {
//     const soundBoxList = document.querySelectorAll(".sound_box");
//     const waveBoxList = document.querySelectorAll(".wave_box");
//     const dragBoxList = document.querySelectorAll("#drag_box");
    
//     setTrackWidth();
//     soundBoxList.forEach( (target) => {target.style.width = trackWidth + "px";})
//     waveBoxList.forEach( (target) => {target.style.width = trackWidth + "px";})
//     dragBoxList.forEach( (target) => {target.style.width = trackWidth + "px";})
// }

// function setTrackWidth() {
//     let playDuration = 0;
//     for ( const track of trackSourceStore.values() ) {
//         if(track){ playDuration = Math.max(playDuration, track.duration);
//         }
//     }
//     maxPlayDuration = Math.max(maxPlayDuration, playDuration); 
//     trackWidth = maxPlayDuration * widthRatio;
// }

// function drawAllWave() {
//     const waves = document.querySelectorAll(".wave_bar");
//     for (const wave of waves) {
//         const source = sourceStore.get(wave.id);
//         wave.width = (source.duration * widthRatio); 
//         wave.left = (source.startTime * widthRatio);  
//         wave.style.left = (source.startTime * widthRatio) + "px"; // 시작 지점
//         wave.style.width = (source.duration * widthRatio) + "px"; // border크기 때문에 2px 뺌
//         createWave(source.sourceKey);
//     }
// }

// function drawWave(waves, trackKey) {
//     const waveBox = document.getElementById(trackKey);
//     for (const wave of waves) {
//         const source = sourceStore.get(wave.id);
//         wave.width = (source.duration * widthRatio); 
//         wave.left = (source.startTime * widthRatio);  
//         wave.style.left = (source.startTime * widthRatio) + "px"; // 시작 지점
//         wave.style.width = (source.duration * widthRatio) + "px"; // border크기 때문에 2px 뺌
//         waveBox.appendChild(wave);
//         createWave(source.sourceKey);
//     }
// }

// function createWave(sourceKey) {
//     const source = sourceStore.get(sourceKey);
//     const wave = document.getElementById(sourceKey);
//     const samplesPerSec = 30 // 1초당 표시할 샘플의 수
//     const rawData = source.audioBuffer.getChannelData(0); // 첫번쨰 채널의 AudioBuffer
//     const totalSamples = source.duration * samplesPerSec; // 구간 처리 후 전체 샘플 수
//     const blockSize = Math.floor(sampleRate / samplesPerSec); // 샘플링 구간 사이즈
//     const filteredData = [];
    
//     for (let i = 0; i < totalSamples; i++) {
//         const blockStart = blockSize * i; // 샘플 구간 시작 포인트
//         let blockSum = 0;
    
//         for (let j = 0; j < blockSize; j++) {
//         if (rawData[blockStart + j]) {
//             blockSum = blockSum + Math.abs(rawData[blockStart + j]); 
//             }
//         }
    
//     filteredData.push(blockSum / blockSize); // 구간 평균치를 결과 배열에 추가
//     }

//     const ctx = wave.getContext('2d');
//     const dpr = window.devicePixelRatio || 1;
//     const canvasHeight = wave.height;
//     const canvasWidth = wave.width;

//     ctx.scale(dpr, dpr);
//     // ctx.clearRect(0, 0, canvasWidth, canvasHeight);

//     // 샘플 1개가 차지할 넓이
//     const sampleWidth = canvasWidth / filteredData.length;
//     let lastX = 0; // x축 좌표

//     ctx.beginPath(); // 선을 그리기 위해 새로운 경로를 만든다.
//     ctx.moveTo(lastX, canvasHeight);
//     ctx.strokeStyle = 'rgb(102, 156, 192)'; // 라인 컬러 설정
//     ctx.fillStyle = 'rgb(102, 156, 192)'; // 그래프 내부를 채울 컬러 설정

//     filteredData.forEach((sample, index) => { // 샘플 데이터 배열 루프
//     const x = sampleWidth * index; // x 좌표
//     ctx.lineWidth = 2; // 라인 그래프의 두께
//     ctx.lineTo(
//         x,
//         canvasHeight - Math.abs(sample * canvasHeight * source.gainValue), // y축 좌표
//     );
//     lastX = x;
//     });

//     // 라인 그래프의 하단을 선으로 연결해서 닫힌 형태로 만든 후, 색을 채운다
//     ctx.lineTo(lastX, canvasHeight);
//     ctx.moveTo(0, 0);
//     ctx.stroke();
//     ctx.fill();
//     ctx.closePath(); // 그래프가 완성되었으므로 경로를 닫는다.
// }

// function drawSelectedBar(beforeWidthRatio) {
//     const selectedBar = document.getElementById("selected_bar");
//     if(selectedBar){
//         const selectedBarDuration = parseFloat(selectedBar.style.width) / beforeWidthRatio;
//         const selectedBarLeft = parseFloat(selectedBar.style.left) / beforeWidthRatio; 
//         selectedBar.style.width = `${selectedBarDuration * widthRatio}px`;
//         selectedBar.style.left = `${selectedBarLeft * widthRatio}px`;
//     }
// }

// function drawTimeLine() {
//     // 지우고 다시 그리기 위한 작업
//     const allLabel = document.querySelectorAll(".time_label"); 
//     allLabel.forEach( (label) => label.remove());

//     let per = 10 // 몇 초 단위로 라벨을 붙일 것인 지 (기본 = 10)
//     const perMini = 1 // 미니 라벨 붙이는 간격
//     const playTime = trackWidth / widthRatio

//     if(widthRatio >= 25){ // widthRatio가 커지면 timeLine의 width가 늘어남에 따라 초당 찍을 수 있는 시간도 늘어남
//         per = 2;
//     }else if (widthRatio >= 10){
//         per = 5
//     }

//     for (let i = 0; i < playTime; i++) {
//         if( (i % per) === 0){
//             const second = String(i % 60).padStart(2, '0'); // 두 자리수 표현
//             const minute = String(parseInt(i / 60)).padStart(2, '0'); // 두 자리수 표현
//             const left = widthRatio * i;
//             const label = document.createElement("label");

//             label.classList.add("time_label");
//             label.style.left = left + "px";
//             label.innerText = minute + ":" + second;
//             timeLine.appendChild(label);
//         }else if( (i % perMini) === 0 ) {
//         }
        
//     }

//     timeLineBox.style.width = trackWidth + "px"
//     timeLine.style.width = trackWidth + "px";
// }

// function drawStick(currentPlayTime) {
//     // 지우고 다시 그리기 위한 작업
//     const oldStick = document.getElementById("time_stick");
//     const newStick = document.createElement("div");

//     if(oldStick) { oldStick.remove() };
//     if(currentPlayTime){ 
//         newStick.style.left = (currentPlayTime * widthRatio) + stickStartOffset + "px"; 
//     }else{
//         newStick.style.left = stickStartOffset + "px";
//     }

//     newStick.id = "time_stick";
//     const timeLineHeight = parseInt(getComputedStyle(timeLine).getPropertyValue("height"));
//     const tracksHeight = trackSourceStore.size * 97;
//     const borderHeight = trackSourceStore.size * 3; // border 길이만큼 더 더함
//     newStick.style.height =  timeLineHeight + tracksHeight + borderHeight + "px";

//     trackContainer.prepend(newStick);
//     timeStick = newStick;
// }


// async function moveStick() {
//     const currentStickLeft = timeStick.style.left ? parseFloat(timeStick.style.left) : stickStartOffset;
//     timeStick.style.left =  currentStickLeft + (widthRatio / 20) + "px"; // 인터벌을 0.05초 단위로 설정하면, 0.05초당 초당 픽셀(widthRatio)을 20으로 나눈 값만큼 이동
//     if(currentStickLeft - stickStartOffset >= trackWidth){ // 스틱이 트랙의 길이 보다 넘어가면 재생이 끝난 것으로 간주하고 처음으로 돌아감
//         clearInterval(timeStickInterval);
//         timeStick.style.left = stickStartOffset + "px";playTrack
//         await initPlayTime(); // Start Offset 초기화
//         isTrackPlaying ? playTrackSound(trackSourceStore.get(currentTrackNode.trackKey)) : await play();
//     }
// }



// /**
//  * Sound Play Function
//  */
// async function play(isAdjust = false) {
//     if(isPlaying){
//         endTime = new Date();
//         currentCombinedSource.stop();
//         clearInterval(timeStickInterval);
//         startOffset += (endTime - startTime) / 1000
//         isPlaying = false;
//         changePlayPause(false, null, isAdjust);
//     }else{
//         if(isTrackPlaying){ // 이미 플레이중인 개별 트랙이 있을 경우
//             playTrackSound(trackSourceStore.get(currentTrackNode.trackKey));
//         }
//         const mergedBuffer = await getAllTrackMergedBuffer();
//         source = audioCtx.createBufferSource();
//         source.buffer = mergedBuffer;
//         source.connect(audioCtx.destination);

//         startTime = new Date();
//         source.start(0, startOffset);
//         clearInterval(timeStickInterval);
//         timeStickInterval = setInterval(() => { moveStick() }, 50);
//         currentCombinedSource = source;
//         isPlaying = true;
//         changePlayPause(true, null, isAdjust);
//     }
// }

// function playTrackSound(selectedTrackNode, isAdjust = false) {
//     if(isTrackPlaying){ // 이미 플레이중인 경우
//         endTime = new Date();
//         currentTrackNode.source.stop();
//         clearInterval(timeStickInterval);
//         startOffset += (endTime - startTime) / 1000
//         isTrackPlaying = false;
//         changePlayPause(false, currentTrackNode.trackKey, isAdjust);
//         if( currentTrackNode.trackKey !==  selectedTrackNode.trackKey ){ // 특정 트랙이 실행 중일 때 다른 트랙 실행 버튼을 누른 경우
//             playTrackSound(selectedTrackNode); // 다른 트랙을 클릭한 경우에는 기존의 사운드를 멈추고 새로운 트랙 실행
//         }
//     }else{
//         if(isPlaying){ // 이미 통합 사운드가 실행 중일 경우
//             play();
//         }
//         const source = audioCtx.createBufferSource();
//         selectedTrackNode.setBufferSource(source);
//         source.buffer = selectedTrackNode.audioBuffer;
//         source.connect(audioCtx.destination);
//         source.start(0, startOffset);
//         startTime = new Date();

//         clearInterval(timeStickInterval); // 이전에 있던 interval이 있을 수 있으므로 지움 ( 겹치면 timeStick의 이동 속도가 빨라져 버림)
//         timeStickInterval = setInterval(() => { moveStick() }, 50);
//         currentTrackNode = selectedTrackNode; // 현재 재생 중인 source를 전역변수로 저장
//         isTrackPlaying = true;
//         changePlayPause(true, selectedTrackNode.trackKey, isAdjust);
//     }
// }

// function changePlayPause(toPlay, trackKey, isAdjust = false) {
//     if(isAdjust) {return;} // startOffset을 클릭해서 조정할 때에는 무시
//     if(trackKey){
//         const trackPlayButton = document.querySelector("#track_option ." + trackKey);
//         if(!trackPlayButton) return;
//         toPlay ? trackPlayButton.innerText = "∥" : trackPlayButton.innerText = "▶"
//     }else{
//         toPlay ? playButton.innerText = "∥" : playButton.innerText = "▶"
//     }    
// }

// async function clickStartOffset(event) {
//     const currentTime = getClickedTime(event);
//     if(currentTime <= 0) { return; } // 클릭을 너무 빨리해서 offset에 문제가 생기는 경우가 있는데 그걸 방지
//     await adjustStartOffset(currentTime);
//     drawStick(currentTime);
// }

// function getClickedTime(event) {
//     let element = event.target;
//     let rect = element.getBoundingClientRect();
//     let clickOffset = event.clientX - rect.left + element.scrollLeft;
//     let offsetPercent = (clickOffset / element.offsetWidth) * 100;

//     /** 전체 width에서 클릭 지점이 차지하는 비율을 구하고 전체 width와 곱하면 클릭한 지점까지의 길이가 됨. 거기에 초당 width 비율을 곱해서 길이에 대한 초를 구함. */
//     return (trackWidth * (offsetPercent / 100)) / widthRatio;
// }



// /**
//  * 현재 플레이 중인 상태를 파악하여 startOffset을 재설정하는 보조 메소드 
//  * isTrackPlaying이 true인 경우 : track사운드를 한 번 정지하고 startOffset을 currentPlayTime으로 설정한 후 재시작
//  * isPlaying인 경우 : 모든 track이 합쳐진 merged sound를 한 번 정지하고 startOffset을 currentPlayTime으로 설정한 후 재시작
//  * 그 외 : startOffset을 currentPlayTime으로 설정
//  */
// async function adjustStartOffset(currentPlayTime) {
//     if(isTrackPlaying){
//         playTrackSound(trackSourceStore.get(currentTrackNode.trackKey), true); // playTrackSound()를 수행하기 위해서는 Track에 대한 sourceNode 객체가 필요
//         startOffset = currentPlayTime;
//         playTrackSound(trackSourceStore.get(currentTrackNode.trackKey), true);
//     }
//     else if(isPlaying){
//         await play(true); // 한 번 재생을 멈춤
//         startOffset = currentPlayTime;
//         await play(true); // offset을 0으로 설정 후 다시 재생
//     }else{
//         startOffset = currentPlayTime;
//     }
// }

// async function getAllTrackMergedBuffer() {
//     let maxLength = 0;
//     for (const source of trackSourceStore.values()) { // maxLength를 구함
//         if(source) { maxLength = Math.max(maxLength, source.length); }
//     }
//     return maxLength === 0 ? null : await mergeSources(maxLength, trackSourceStore.values(), true);
// }



// /** 
//  * Merge all sources of track of passed number and create new SourceNode object to reset trackSourceStore's value 
//  * */
// async function mergeTrackSources(trackNumber) {
//     const trackSourceList = [];
//     for (const source of sourceStore.values()) { // track에 해당하는 source들을 골라 따로 배열을 만들어 둠
//         if(source.trackNumber === trackNumber){
//             trackSourceList.push(source);
//         }
//     }
//     const maxLength = calculateTotalDuration(trackNumber) * sampleRate // length 는 duration에 sampleRate를 곱한 값과 일치함
//     const mergedBuffer = maxLength === 0 ? null : await mergeSources(maxLength, trackSourceList);
//     const source = audioCtx.createBufferSource();
//     const newTrack = new TrackNode(trackNumber, mergedBuffer);
//     source.buffer = mergedBuffer;
//     newTrack.setBufferSource(source);
//     newTrack.setGainValue(1);
//     trackSourceStore.set(newTrack.trackKey, newTrack);
// }

// function calculateTotalDuration(trackNumber) {
//     let maxDuration = 0;
//     let totalSilenceTime = 0;
//     const trackSourceList = [];
//     for (const source of sourceStore.values()) { // track에 해당하는 source들을 골라 따로 배열을 만들어 둠
//         if(source.trackNumber === trackNumber){
//             trackSourceList.push(source);
//             maxDuration += source.duration; // 사운드들의 length를 다 더함
//         }
//     }

//     // maxLength에 silence의 length를 추가하여 최종 length 계산하기
//     trackSourceList.sort( (a, b) => a.startTime - b.startTime);
//     for (let i = 0; i < trackSourceList.length; i++) {
//         const silenceStartTime = trackSourceList[i - 1] ? trackSourceList[i - 1].endTime : 0;
//         const silenceEndTime = trackSourceList[i].startTime;
//         totalSilenceTime += silenceEndTime - silenceStartTime; 
//     }
//     maxDuration += totalSilenceTime;
//     return maxDuration; 
// }

// async function mergeSources(maxLength, sources, isAllTrack = false) {
//     const offlineCtx = new OfflineAudioContext(numberOfChannels, maxLength, sampleRate);
//     for (const node of sources) {
//         if(node){
//             const source = offlineCtx.createBufferSource();
//             const gainNode = offlineCtx.createGain();
//             gainNode.gain.value = isAllTrack ? 1 : node.gainValue;
//             source.buffer = node.audioBuffer;
//             source.connect(gainNode);
//             gainNode.connect(offlineCtx.destination);
//             source.start(node.startTime); // The information of function "start()" : Schedules(예약하다) playback of the audio data contained in the buffer, or begins playback immediately. Additionally allows the start offset and play duration to be set. 
//         }   
//     } 

//     const renderBuffer = await offlineCtx.startRendering();
//     return renderBuffer;
// }



// /**
//  * Cutting Sound Function
//  */
// async function cutSound(sourceNode, cutTime, leftRemove = false, rightRemove = false, needMerge = true) {
//     const waves = [];
//     const originAudioBuffer = sourceNode.audioBuffer;
//     const cutFrame = (cutTime - sourceNode.startTime) * sampleRate;
//     let leftSourceNode = null;
//     let rightSourceNode = null;

//     console.log(originAudioBuffer.getChannelData(0).length)
//     console.log(cutFrame)

//     // 자르는 구간이 양끝과 딱 일치하는 경우 cutFrame이 0이 되거나  자를 게 없는 경우가 생김. 그런 경우를 방지.
//     if(cutFrame <= 0 || originAudioBuffer.getChannelData(0).length - cutFrame < 1) return;

//     // 기존의 waveBar 및 selectedBar 지우기
//     if(needMerge) {
//         // 작업을 수행하기 전에 undo list에 추가
//         pushStore(undoSourceList, sourceStore);
//         pushStore(undoTrackList, trackSourceStore);
//         clearRedoList();
//         document.getElementById("selected_bar")?.remove(); // cover를 통해 cutSound가 이루어지는 경우 selected bar를 유지
//     }
//     document.getElementById(sourceNode.sourceKey)?.remove();
//     sourceStore.delete(sourceNode.sourceKey);

//     if(!leftRemove){
//         const leftAudioBuffer = separateSound(originAudioBuffer, 0, cutFrame);
//         leftSourceNode = new SourceNode(++waveIndex, sourceNode.trackNumber, leftAudioBuffer);
//         leftSourceNode.setStartTime(sourceNode.startTime);
//         leftSourceNode.resetEndTime();
//         leftSourceNode.setGainValue(sourceNode.gainValue);
//         sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);
//         waves.push(createWaveBar(leftSourceNode.index, leftSourceNode.trackNumber));
//     }
    
//     if(!rightRemove){
//         const rightAudioBuffer = separateSound(originAudioBuffer, cutFrame, undefined);
//         rightSourceNode = new SourceNode(++waveIndex, sourceNode.trackNumber, rightAudioBuffer);
//         rightSourceNode.setStartTime(cutTime);
//         rightSourceNode.resetEndTime();
//         rightSourceNode.setGainValue(sourceNode.gainValue);
//         sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);
//         waves.push(createWaveBar(rightSourceNode.index, rightSourceNode.trackNumber));
//     }

//     if(needMerge) { 
//         removeAllSelected();
//         await mergeTrackSources(sourceNode.trackNumber) 
//     };
//     drawWave(waves, sourceNode.trackKey);
// }

// async function coverSource(sourceNode, firstCutTime, secondCutTime) {
//     const waveBox = document.querySelector(`#${sourceNode.trackKey} .wave_box`);
//     const originAudioBuffer = sourceNode.audioBuffer;
//     const firstCutFrame = (firstCutTime - sourceNode.startTime) * sampleRate;
//     const secondCutFrame = (secondCutTime - sourceNode.startTime) * sampleRate;
//     let leftSourceNode = null;
//     let rightSourceNode = null;

//     // 기존의 waveBar 지우기
//     document.getElementById(sourceNode.sourceKey).remove();
//     sourceStore.delete(sourceNode.sourceKey);

//     for (let i = 0; i < 2; i++) {
//         switch (i) {
//             case 0:{
//                 const leftAudioBuffer = separateSound(originAudioBuffer, 0, firstCutFrame);
//                 leftSourceNode = new SourceNode(++waveIndex, sourceNode.trackNumber, leftAudioBuffer);
//                 leftSourceNode.setStartTime(sourceNode.startTime);
//                 leftSourceNode.resetEndTime();
//                 leftSourceNode.setGainValue(sourceNode.gainValue);
//                 sourceStore.set(leftSourceNode.sourceKey, leftSourceNode);
        
//                 const leftWave = createWaveBar(leftSourceNode.index, leftSourceNode.trackNumber);
//                 waveBox.appendChild(leftWave);
//                 break;   
//             }
//             case 1:{
//                 const rightAudioBuffer = separateSound(originAudioBuffer, secondCutFrame, undefined);
//                 rightSourceNode = new SourceNode(++waveIndex, sourceNode.trackNumber, rightAudioBuffer);
//                 rightSourceNode.setStartTime(secondCutTime);
//                 rightSourceNode.resetEndTime();
//                 rightSourceNode.setGainValue(sourceNode.gainValue);
//                 sourceStore.set(rightSourceNode.sourceKey, rightSourceNode);
        
//                 const rightWave = createWaveBar(rightSourceNode.index, rightSourceNode.trackNumber);
//                 waveBox.appendChild(rightWave);
//                 break;
//             }
//         }
//     }
//     drawAllWave();
// }

// function separateSound(originAudioBuffer, startFrame, endFrame) {
//     const mono = originAudioBuffer.getChannelData(0).slice(startFrame, endFrame);
//     const stereo = originAudioBuffer.numberOfChannels >= 2 ? originAudioBuffer.getChannelData(1).slice(startFrame, endFrame) : originAudioBuffer.getChannelData(0).slice(startFrame, endFrame);
//     const newAudioBuffer = new AudioBuffer({
//         sampleRate: sampleRate,
//         length: mono.length,
//         numberOfChannels: 2
//     });
//     newAudioBuffer.getChannelData(0).set(mono);
//     newAudioBuffer.getChannelData(1).set(stereo);
//     return newAudioBuffer;
// }



// /**
//  * Redo Undo Function
//  */
// async function undo() {
//     if(undoSourceList.length <= 0){return;}
//     const currentPlayTime = getCurrentPlayTime();

//     pushStore(redoSourceList, sourceStore);
//     pushStore(redoTrackList, trackSourceStore);
//     sourceStore = undoSourceList.pop();
//     trackSourceStore = undoTrackList.pop();
//     recreateAllElement();
//     document.getElementById("selected_bar")?.remove();
//     await adjustStartOffset(currentPlayTime);
// }

// async function redo() {
//     if(redoSourceList.length <= 0){return;}
//     const currentPlayTime = getCurrentPlayTime();

//     pushStore(undoSourceList, sourceStore);
//     pushStore(undoTrackList, trackSourceStore);
//     sourceStore = redoSourceList.pop();
//     trackSourceStore = redoTrackList.pop();
//     recreateAllElement();
//     document.getElementById("selected_bar")?.remove();
//     await adjustStartOffset(currentPlayTime);
// }

// function pushStore(array, store) {
//     array.push(deepCopyMap(store));
//     if(array.length >= 10){array.shift();}
// }

// function clearRedoList() {
//     redoSourceList.length = 0;
//     redoTrackList.length = 0;
// }

// function getCurrentPlayTime() {
//     return (parseFloat(timeStick.style.left) - stickStartOffset) / widthRatio;
// }

// function recreateAllElement() {
//     removeAllElement();
//     for (const track of trackSourceStore.values()) {
//         createSoundbar(track.trackNumber);
//         const waveBox = document.getElementById(track.trackKey);
//         for (const source of sourceStore.values()) {
//             if(track.trackKey === source.trackKey){
//                 const waveBar = createWaveBar(source.index, source.trackNumber);
//                 waveBox.appendChild(waveBar);
//             }
//         } 
//     }
//     drawAllWave();
// }

// function removeAllElement() {
//     const waveBars = document.querySelectorAll(".sound_box");
//     const trackPlayButtons = document.querySelectorAll(".track_play_button");
//     waveBars.forEach((waveBar) => {waveBar.remove()})
//     trackPlayButtons.forEach((button) => {button.remove()})
// }



// /**
//  * Recording Function
//  */
// function startRecording() {
//     if(navigator.mediaDevices){
//         navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
//             recorder = new MediaRecorder(stream, { mimeType: 'audio/webm',});
//             recorder.addEventListener('dataavailable', event => {
//                 recordedData.push(event.data);
//             });
//             recorder.addEventListener('stop', event => {
//                 const fileReader = new FileReader();
//                 const blob = new Blob(recordedData, { type: 'audio/webm' });

//                 fileReader.readAsArrayBuffer(blob);    
//                 fileReader.onload = async function() {
//                     const arrayBuffer = fileReader.result;
//                     const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer); // 이 메소드는 MP3와 WAV, webm 등의 확장자에만 가능하다는 듯 하다.
//                     waveIndex++; 
//                     trackNumber++;
//                     const sourceNode = new SourceNode(waveIndex, trackNumber, audioBuffer);
//                     sourceStore.set("source" + waveIndex, sourceNode);
//                     await mergeTrackSources(trackNumber); // track이 새로 생성될 때 trackSourceStore에 sourceNode를 한 번 초기화 해 놓기

//                     // 파일 하나당 트랙추가
//                     createSoundbar(waveIndex, trackNumber);  
//                     recorder = null;
//                 }
//             });
//             recorder.start();
//         })
//         .catch(error => console.error(error));
//     }
//     recordButton.removeEventListener("click", startRecording);
//     recordButton.addEventListener("click", endRecording);
//     recordButton.classList.add("recording");
// }

// function endRecording() {
//     recorder.stop();
//     recordButton.removeEventListener("click", endRecording);
//     recordButton.addEventListener("click", startRecording);
//     recordButton.classList.remove("recording");
//     recordedData.length = 0;
// }


// /**
//  * Downloading Function
//  */
// async function downloadMixedSound() {
//     const mergedBuffer = await getAllTrackMergedBuffer();
//     const leftChannel = mergedBuffer.getChannelData(0);
//     const rightChannel = mergedBuffer.getChannelData(1);
//     const length = leftChannel.length;
//     const wavBuffer = ChannelDataToWave([leftChannel, rightChannel], length);

//     // download file 
//     const blob = new Blob([wavBuffer], {type: "audio/wav"});
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');

//     link.style.display = 'none';
//     link.href = url;
//     link.download = 'audio.wav';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// }

// const ChannelDataToWave = (channelDatas, len) => {
//     const numOfChan = numberOfChannels;
//     const length = len * numOfChan * 2 + 44;
//     const buffer = new ArrayBuffer(length);
//     const view = new DataView(buffer);     // buffer를 다룰 때 사용
//     const channels = [];
//     let sample= 0;
//     let offset= 0;
//     let pos= 0;
  
//     // 부호없는 16비트로 정수로 변환
//     const setUint16 = (data) => {
//       view.setUint16(pos, data, true);
//       pos += 2;
//     }
  
//     // 부호없는 32비트로 정수로 변환
//     const setUint32 = (data) => {
//       view.setUint32(pos, data, true);
//       pos += 4;
//     }
  
//     // wav 파일의 헤더구조
//     setUint32(0x46464952);                              // "RIFF"
//     setUint32(length - 8);                              // file length - 8
//     setUint32(0x45564157);                              // "WAVE"
  
//     setUint32(0x20746d66);                              // "fmt " chunk
//     setUint32(16);                                      // length = 16
//     setUint16(1);                                       // PCM (uncompressed)
//     setUint16(numOfChan);
//     setUint32(sampleRate);
//     setUint32(sampleRate * 2 * numOfChan);      // avg. bytes/sec
//     setUint16(numOfChan * 2);                           // block-align
//     setUint16(16);                                      // 16-bit (hardcoded in this demo)
  
//     setUint32(0x61746164);                              // "data" - chunk
//     setUint32(length - pos - 4);                        // chunk length
  
//     for (let i = 0; i < channelDatas.length; i++) {
//       channels.push(channelDatas[i]);
//     }
  
//     while (pos < length) {
//       for (let i = 0; i < numOfChan; i++) {
//         sample = Math.max(-1, Math.min(1, channels[i][offset]));
//         sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
//         view.setInt16(pos, sample, true);               // 부호있는 16비트 정수로 변환
//         pos += 2;
//       }
//       offset++
//     }
  
//     return buffer;
// }






// /**
//  * 사운드 플레이, 다운로드 등 특정 소스가 있어야 가능한 행동이 현재 가능한 지 확인하고 callback함수를 호출하는 메소드
//  */
// function checkPlayReady(callback) {
//     let isReady = false;
//     for (const trackNode of trackSourceStore.values()) {
//         if(trackNode) { isReady = true };
//     }
//     if(isReady) {
//         callback();
//     };
// }




// /**
//  * Sub Function
//  */
// // Throttle Function
// function throttle(callback, limit = 50) {
//     let waiting = false
//     return function() {
//         if(!waiting) {
//             callback.apply(this, arguments)
//             waiting = true
//             setTimeout(() => {
//                 waiting = false
//             }, limit)
//         }
//     }
// }

// // Map 깊은 복사 
// function deepCopyMap(store) {
//     const result = new Map();
//     store.forEach((value, key) =>{
//         const copiedNode = copyToSameNode(value);
//         result.set(key, copiedNode);
//     });
  
//     return result;
// }

// // map의 key value에서 value에 해당하는 값의 레퍼런스만 달라질 수 있게 값만 복사
// function copyToSameNode(node) {
//     let result = null;
//     if(node instanceof SourceNode){
//         result = new SourceNode(node.index, node.trackNumber, node.audioBuffer);
//         result.setStartTime(node.startTime);
//         result.resetEndTime();
//         result.setGainValue(node.gainValue);
//     }else if(node instanceof TrackNode){
//         result = new TrackNode(node.trackNumber, node.audioBuffer);
//         result.setStartTime(node.startTime);
//         result.resetEndTime();
//         result.setGainValue(node.gainValue);
//     }
//     return result;
// }


// function copyToNewNode(node) {
//     let result = null;
//     if(node instanceof SourceNode){
//         result = new SourceNode(++waveIndex, node.trackNumber, node.audioBuffer);
//         result.setStartTime(node.startTime);
//         result.resetEndTime();
//         result.setGainValue(node.gainValue);
//     }else if(node instanceof TrackNode){
//         result = new TrackNode(node.trackNumber, node.audioBuffer);
//         result.setStartTime(node.startTime);
//         result.resetEndTime();
//         result.setGainValue(node.gainValue);
//     }
//     return result;
// }