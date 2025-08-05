<script setup>
import { ref, reactive, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MicrophoneIcon, ArrowsPointingOutIcon, Bars3Icon } from '@heroicons/vue/24/solid'
import { useRoute } from "vue-router";
// i18n
import { useI18n } from "vue-i18n";
// Axios
import axios from "axios";
// Moment
// import moment from "moment";
// Animate
import "animate.css";
// Swiper
// import { Swiper, SwiperSlide } from "swiper/vue";
// import { Navigation, Autoplay } from "swiper/modules";
// import "swiper/css";
// import "swiper/css/navigation";
// Recorder
import Recorder from "recorder-core";
import "recorder-core/src/engine/mp3";
import "recorder-core/src/engine/mp3-engine";
import "recorder-core/src/engine/wav.js"
// QR Code
// import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from "vue-qrcode-reader";
// Components
import Navbar from "../components/Navbar.vue";
import { Howl, Howler } from 'howler';
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

import step0Mp3 from '../assets/img/mp3url/step0.mp3'


import micImg from '@/assets/img/mic.png'

// const audioFile = ref(null);

const { t, locale } = useI18n();
const route = useRoute();
const routeParam = ref(null);
// const isTyping = ref(false);
const successBooking = ref(false)
const currentLat = ref(25.033964)
const currentLng = ref(121.564468)
let map, marker
const startLatLng = ref(null)
const mapInstance = ref(null)
const endLatLng = ref(null)
const routeControl = ref(null)
let address
let audio;

const bookingtLat = ref(null)
const bookingLng = ref(null)
const isListening = ref(false);

const bookingAddress = ref("");
const bookingAddressTrue = ref("");

const bookingid = ref("");
const inputMode = ref('voice') // 'voice' or 'text'

const bookstate = ref('success') // 'voice' or 'text'

// 所有 marker 的清單
const markerList = []

const selectedMarker = ref(null)

const mapVisible = ref(false)

// const currentStep = ref(0) // 控制對話進程

const currentStep = ref(0) // 控制對話進程

let currentLocationMarker = null




const playAudio1 = () => {
  audio = new Audio(step0Mp3)
  audio.play()
}

let pickupMarker = null

const highlightMarker = (lat, lng, labelText) => {
  // 先移除原本的 marker（如果有）
  if (pickupMarker) {
    map.removeLayer(pickupMarker)
  }

  console.log('上車地點', lat, lng)

  pickupMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'custom-label-marker',
      html: `
       <div class="marker-wrapper">
         <span class="label-text">${labelText}</span>
             <img class="marker-icon" src="https://cmm.ai/marker/marker-red.png"/>
      
        </div>
      `,
      iconSize: [30, 35],
      iconAnchor: [15, 23]
    })
  }).addTo(map)
  map.setView([lat, lng], 18)
}



const selectPickup = (option) => {
  console.log('地點清單', option)
  isPickupCorrect.value = null
  // audio = new Audio(step0Mp3step2)
  // audio.play()
  // messages.value.push({
  //   label: 'text',
  //   author: 'user',
  //   body: `我要在「${option.name}」上車`
  // })

  // messages.value.push({
  //   label: 'text',
  //   author: 'ai',
  //   body: `您選擇的是「${option.label}：${option.name}」，是否正確？`,
  //   type: 'confirm',
  //   selectedPickup: option.name
  // })




  console.log('selectPickup', option)

  bookingtLat.value = option.lat;
  bookingLng.value = option.lng;
  bookingid.value = option.id;

  bookingAddressTrue.value = option.addr;

  console.log('144 bookingAddressTrue', bookingAddressTrue.value)

  messageinput = option.name;

  console.log("經緯度", bookingtLat.value, bookingLng.value)



  highlightMarker(bookingtLat.value, bookingLng.value, bookingid.value);

  // map.setView([bookingtLat.value, bookingLng.value], map.getZoom())


  bookingAddress.value = option.name;




  sendMessage();

}



// 取得地址（使用 OpenStreetMap Nominatim）
const getAddressFromCoords = async (lat, lng) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`)
  const data = await response.json()
  return data.display_name || '未知地點'
}

const question = reactive([
  "糖尿病初期症狀有哪些？",
  "外食族怎麼吃可以幫助控糖？",
  "如果我餐與餐間吃點心，這樣下一餐飯前血糖會準嗎？",
]);


const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
  iconSize: [30, 50],       // 🟢 放大圖標尺寸
  iconAnchor: [20, 64],     // 🟢 調整 anchor 座標
  popupAnchor: [1, -50],    // 🟢 往上移 popup，不會被圖標蓋到
  shadowSize: [64, 64]      // 🟢 陰影也放大一點以對應圖標
})

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
  iconSize: [120, 100],
  iconAnchor: [25, 80],
  popupAnchor: [1, -50],    // 🟢 往上移 popup，不會被圖標蓋到
  shadowSize: [64, 64]      // 🟢 陰影也放大一點以對應圖標
})

const locationList = ref([])

const initMap = async (loactionlistmap) => {

  await nextTick()

  const defaultLat = 25.087860
  const defaultLng = 121.523949

  const onLocationFound = async (lat, lng) => {
    // recOpen();
    currentLat.value = lat
    currentLng.value = lng

    console.log('現在位置lng', lng)
    console.log('現在位置lat', lat)

    map = L.map('map').setView([currentLat.value, currentLng.value], 17)


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    markerList.push(marker)
    currentLocationMarker = L.circleMarker([currentLat.value, currentLng.value], {
      radius: 10,
      fillColor: '#28a745',   // 藍色
      color: '#ffffff',        // 邊框白色
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);

    map.setView([lat, lng], 17); // 👈 加這行



    setTimeout(() => {
      map.panBy([150, 10])
      startLatLng.value = L.latLng(currentLat.value, currentLng.value)

    }, 100) // 給一點延遲時間，確保地圖已渲染

    // L.marker([], { icon: greenIcon }).addTo(map).bindPopup('龍潭大池停車場入口').openPopup()


    // 終點（紅色）
    // L.marker([25.047675, 121.517055], { icon: redIcon }).addTo(map).bindPopup('目的地')

    // const pickupOptions = [
    //   {
    //     name: '台北市士林區承德路四段181號',
    //     lat: 25.0874783,
    //     lng: 121.5227234
    //   },
    //   {
    //     name: '台北市士林區士林夜市大東路15-32號',
    //     lat: 25.087895013899,
    //     lng: 121.524413992429
    //   },
    //   {
    //     name: '台北市士林區基河路98號',
    //     lat: 25.088451758348,
    //     lng: 121.523515739274
    //   }
    // ]

    // map.on('click', function (e) {
    //   const lat = e.latlng.lat
    //   const lng = e.latlng.lng

    //   console.log('你點的經緯度：', lat, lng)

    //   // 可選：加一個臨時 marker
    //   L.marker([lat, lng]).addTo(map).bindPopup(`你點的位置：<br>${lat}, ${lng}`).openPopup()
    // })

    console.log(loactionlistmap)
    loactionlistmap.forEach((option, index) => {
      const labelText = `${option.id}`
      const marker2 = L.marker([option.lat, option.lng], {
        icon: L.divIcon({
          className: 'custom-label-marker',
          html: `
        <div class="marker-wrapper">
         <span class="label-text">${labelText}</span>
             <img class="marker-icon" src="https://cmm.ai/marker/marker.png"/>
      
        </div>
      `,
          iconSize: [30, 35],
          iconAnchor: [15, 23]
        })
      }).addTo(map)
      markerList.push(marker2) // ✅ 加入列表

      marker2.on('click', () => {
        marker2.openPopup()
        bookingtLat.value = option.lat;
        bookingLng.value = option.lng;
        map.setView([bookingtLat.value, bookingLng.value], 18)

        bookingAddress.value = option.name;

        sendMessage();
        // currentStep.value = 4
        // messages.value.push({
        //   label: 'text',
        //   author: 'user',
        //   body: `我要在「${option.name}」上車`
        // })

        // messages.value.push({
        //   label: 'text',
        //   author: 'ai',
        //   body: `您選擇的是「${option.name}」，是否正確？`,
        //   type: 'confirm',
        //   selectedPickup: option.name
        // })

      })
    })
    // 導航路線（上車地 → 目的地）
    // L.Routing.control({
    //   show: false,           // 不顯示 routing control（包含行程說明）
    //   waypoints: [
    //     L.latLng(lat, lng), // 起點（當前位置）
    //     L.latLng(25.047675, 121.517055)  // 終點（台北車站）
    //   ],
    //   lineOptions: {
    //     styles: [{ color: '#d61718', weight: 6 }]
    //   },
    //   routeWhileDragging: false,
    //   showAlternatives: false,
    //   addWaypoints: false,
    //   draggableWaypoints: false,
    //   createMarker: function () { return null } // 不要顯示 marker
    // }).addTo(map)

    setTimeout(() => {
      map.invalidateSize()
    }, 300)
    // 🌍 顯示位址訊息
    // address = await getAddressFromCoords(lat, lng);
    // const locationText = `📍目前位置：${address}，請問哪一個上車地點上車`
    // messages.value.push({
    //   label: "prologue",
    //   author: "ai",
    //   body: locationText,
    //   // type: 'confirm'
    // })

  }

  if (!map) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationFound(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        console.warn("無法取得使用者位置，改用預設位置", err)
        onLocationFound(defaultLat, defaultLng)
      }
    )
  }
}



const fetchNearbyLocations = async (lat, lng) => {
  try {
    const response = await axios.get('https://cmm.ai:8068/get_nearby_loc', {
      params: {
        lat,
        lng,
        radius: 50
      },
      headers: {
        accept: 'application/json'
      }
    })

    return response.data;
  } catch (error) {
    console.error('取得附近地點失敗:', error)
    return []
  }
}

// 組件掛載時自動執行
onMounted(async () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      console.log("取得當前位置：", lat, lng)
      const nearbyLocations = await fetchNearbyLocations(lat, lng)
      console.log('附近地點：', nearbyLocations)
      locationList.value = nearbyLocations
      currentLat.value = lat
      currentLng.value = lng

      mapVisible.value = true // ✅ 顯示地圖
      await nextTick() // 等待 DOM 渲染完成
      initMap(locationList.value, lat, lng)

      messages.value.push({
        label: "prologue",
        author: "ai",
        body: '以下是離您最近的上車地點',
      })

      messages.value.push({
        label: "loction",
        author: "ai",
        type: "loction",
        body: locationList.value.map((option) => ({
          id: option.id,
          name: option.name,
          lat: option.lat,
          lng: option.lng,
          addr: option.addr
        }))
      })

    },
    (error) => {
      console.error("❌ 取得定位失敗", error)
      // 如果定位失敗，fallback 到預設位置
      const fallbackLat = 25.087794462690706
      const fallbackLng = 121.52379069852944
      // 你可以複製上面流程再跑一次 fetchNearbyLocations(fallbackLat, fallbackLng)
    }
  )
})


const userMessage = ref("");
// let modules = [Navigation, Autoplay]; // Swiper

// AI 客服回覆訊息
let messages = ref([]);

watch(messages.value, (val) => {
  console.log("messages", val);
  scrollToBottom();
});

const chatArea = ref(null); // 對話框

// 滾動到對話框底部
const scrollToBottom = () => {
  setTimeout(() => {
    console.log("chatArea.value", chatArea.value.scrollHeight);

    chatArea.value.scrollTo({
      top: chatArea.value.scrollHeight,
      behavior: "smooth",
    });
  }, 100);
};

let questionList = ref([]);



let appoinmentInfo = reactive({}); // 掛號資料


const isSeniorTicketValue = ref(null)
const pickup = ref(null)
const isPickupCorrect = ref(null);
let messageinput
// 傳送訊息
async function sendMessage(msg) {
  console.log("sendMessage", userMessage.value);

  pauseAudio();


  messageinput = userMessage.value;


  const lastMessage = messages.value[messages.value.length - 1]
  const payload = {
    query: messageinput,
    lng: 0,
    lat: 0,
    addr: "string",
    pickup: pickup.value,
    chat_history: questionList.value,
    is_senior_ticket: null,
    location_list: locationList.value

  };
  console.log("booking", bookingtLat.value, bookingLng.value);


  if (bookingtLat.value != null && bookingLng.value != null) {
    console.log('userMessage.value ')
    if (userMessage.value != "") {
      messageinput = userMessage.value;
    } else {
      messageinput = bookingAddress.value;

    }

    console.log(bookingtLat.value, bookingLng.value, bookingAddress.value)

    payload.addr = bookingAddress.value;

    pickup.value = {
      "id": bookingid.value,
      "name": bookingAddress.value,
      "lng": bookingLng.value,
      "lat": bookingtLat.value,
      "addr": bookingAddressTrue.value
    }
    payload.pickup = pickup.value;
    console.log("pickup", pickup.value)
  } else {
    console.log("沒有帶到pickup value", locationList.value);
    // pickup.value = locationList.value.map(item => ({
    //   addr:item.addr,
    //   id: item.id,
    //   name: item.name,
    //   lng: item.lng,
    //   lat: item.lat
    // }));
    // console.log(pickup.value)
    // pickup.value = {
    //   "id": bookingid.value,
    //   "name": bookingAddress.value,
    //   "lng": bookingLng.value,
    //   "lat": bookingtLat.value,
    //   "addr": bookingAddressTrue.value
    // }
  }
  userMessage.value = ""; // 清空輸入框


  console.log('lastMessage.body)', lastMessage.body, messages.value)

  const isPickupConfirm = lastMessage.body.includes("您選擇的是") && lastMessage.body.includes("是否正確？")
  const isSeniorTicket = lastMessage.body.includes("請問您是否需要使用敬老愛心卡？");
  if (msg === "是") {
    messageinput = "是"
  } else if (msg === "否") {
    messageinput = "否"
  }
  if (messageinput !== "") {

    console.log('判斷式messageinput', messageinput);

    console.log(questionList.value)
    console.log("successBookingvalue", successBooking.value)
    if (successBooking.value === false) {
      successBooking.value = true;

      const locListOriginal = JSON.stringify(locationList.value)
      const locListsingleQuoted = locListOriginal.replace(/"/g, "'");
      console.log(`目前位置：${bookingtLat.value},${bookingLng.value}，附近上車地點有以下${locListsingleQuoted}`)

      const originalA = `目前位置：${currentLat.value},${currentLng.value}，附近上車地點有以下${locListsingleQuoted}`;

      questionList.value.push({
        q: !messageinput ? "" : messageinput,
        a: `${originalA}`, // ← 用反引號 ``
      });

      console.log("✅ 第一次 push questionList", questionList.value, locationList.value)
    }
    if (isPickupConfirm) {
      if (msg === "是") {
        isPickupCorrect.value = true
        console.log('isPickupConfirm,是')
        messageinput = "是"
        payload.is_pickup_correct = isPickupCorrect.value;
        payload.query = "是"

      } else if (msg === "否") {
        console.log('isPickupConfirm,否')
        isPickupCorrect.value = false;
        messageinput = "否"
        payload.is_pickup_correct = isPickupCorrect.value;
        payload.query = "否"
        map.removeLayer(pickupMarker);
        map.setView([currentLat.value, currentLng.value], 18)

      }
    }

    if (isSeniorTicket) {
      if (msg === "是") {
        isSeniorTicketValue.value = true
        payload.is_senior_ticket = isSeniorTicketValue.value;
        payload.is_pickup_correct = true;
        payload.query = "是"
        payload.query = messageinput
      } else if (msg === "否") {
        isSeniorTicketValue.value = false
        messageinput = "否"
        payload.is_senior_ticket = isSeniorTicketValue.value;
        payload.is_pickup_correct = true;
        payload.query = "否"

      }
    }

    if (messageinput && messageinput !== "") {
      // 使用者訊息
      messages.value.push({
        label: "text",
        author: "user",
        body: messageinput,
      });
    } else {
      messages.value.push({
        label: "text",
        author: "ai",
        body: "抱歉，我沒有聽得很清楚，麻煩請您再說一次，謝謝。",
      });

      return;
    }

    scrollToBottom();

  } else {
    return;
  }




  let url = `https://cmm.ai:8068/ask`;


  try {
    console.log("🚀 發送前", questionList.value, payload)

    const response = await axios.post(url, payload)

    console.log("✅ 發送成功，收到 response：", response)

    if (response.status === 200) {


      playAudio(response.data.mp3_url)
      pickup.value = response.data.pickup;
      // if(response.data.pickup!=null && response.data.pickup!= undefined){

      // }
      if (response.data.type === "location") {

        locationList.value = response.data.location_list
        console.log(locationList.value)
        mapVisible.value = true // ✅ 顯示地圖
        await nextTick() // 保證 DOM 渲染完成再呼叫 initMap
        initMap(locationList.value)

        response.data.result.forEach((msg) => {
          messages.value.push({
            label: "text",
            author: "ai",
            body: msg,
            type: response.data.type || 'text'  // 預設為 text，避免 type 為 undefined
          });
        });

        messages.value.push({
          label: "loction",
          author: "ai",
          type: "loction",
          body: locationList.value.map((option, index) => ({
            id: option.id,
            name: option.name,
            lat: option.lat,
            lng: option.lng,
            addr: option.addr
          }))
        });
      } else {
        setTimeout(() => {
          response.data.result.forEach((msg) => {
            messages.value.push({
              label: "text",
              author: "ai",
              body: msg,
              type: response.data.type || 'text'  // 預設為 text，避免 type 為 undefined
            });
          });

          scrollToBottom();
        }, 300);
      }


      // questionList.value = response.data.chat_history;

      questionList.value[questionList.value.length - 1].a = response.data.result;
      console.log("response", questionList.value);
    }

    console.log("messages.value", messages.value);

  } catch (error) {
    console.error("❌ 發生錯誤：", error);
  }
}

let showInput = ref(true); // 輸入框



// 底部選單
const menu = ref(null);
const menuHeight = ref(0);

let isRotate = ref(false);

const handleResize = () => {
  updateVoiceItem();
};




// 音訊結束後暫停影片播放
const onAudioEnded = () => {
  // 清空音訊
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value.currentTime = 0;
    currentAudio.value = null;
  }

  // 播放點頭影片
  videoSrc.value = videoMuteSources.value;
  // video.value.loop = true; // 設置循環播放
  videoPlay();
};

// 判斷音訊是否為播放狀態
const onAudioPlay = () => {
  isAudioPlaying.value = true;
  console.log("isAudioPlaying.value", isAudioPlaying.value);
};

const onAudioPause = () => {
  isAudioPlaying.value = false;
  isVideoPause.value = false;
  console.log("isAudioPlaying.value", isAudioPlaying.value);
};

const audioURL = ref(null);
const audioFile = ref(null); // 音訊檔案

let recordTime = ref(0); // 錄音時間
let isRecording = ref(false); // 錄音狀態
let timer;

// let recognition = null

// 語音轉文字
async function handleAudioToText() {
  isRecording.value = false;
  let audioLang; // 音訊語言
  let lang = localStorage.getItem("lang");
  console.log("lang", lang);

  switch (lang) {
    case "zh-tw":
      audioLang = "cmn-Hant-TW";
      break;
    case "en-us":
      audioLang = "en-US";
      break;
    case "ja-jp":
      audioLang = "ja-JP";
      break;
    default:
      break;
  }
  // 國語
  let url = `https://cmm.ai:9800/transcribe/?language_code=zh`;
  // 台語
  // let url=`https://cmm.ai:9800/transcribe/?language_code=tw&field=hotai`

  const formData = new FormData();
  formData.append("file", audioFile.value);

  try {
    console.log("audioFile.value", audioFile.value);
    const response = await axios.post(url, formData);
    console.log("語音轉文字 response", response);

    userMessage.value = response.data.message.CorrectedTranscript;

    // handleTTS(userMessage.value); // 取得語音回覆

    if (response.data.message !== "") {
      sendMessage(); // 傳送使用者訊息
    } else {
      if (showAnchor.value) {
        alert("語音辨識有誤，請重新錄製。");
        videoLoading.value = false;
        return;
      } else {
        messages.value.push({
          label: "text",
          author: "user",
          body: "語音辨識有誤，請重新錄製。",
        });
      }
    }
  } catch (error) {
    console.log("error", error);
  }
}

// 語音轉文字 (使用 recorder-core 錄音)
let rec, wave;

// 調用 open 請求錄音權限
let recOpen = function (success) {
  rec = Recorder({
    type: "wav",              // 你這裡用 mp3，但 Whisper 較建議 wav，見下方備註
    sampleRate: 16000,        // ✅ Whisper 最佳建議設定
    bitRate: 16,
    audioTrackSet: {
      echoCancellation: true,     // ✅ 回音消除
      noiseSuppression: true,     // ✅ 噪音抑制
      autoGainControl: true       // ✅ 自動增益（提升語音音量）
    },
    onProcess: function (
      buffers,
      powerLevel,
      bufferDuration,
      bufferSampleRate,
      newBufferIdx,
      asyncEnd
    ) {
      wave &&
        wave.input(buffers[buffers.length - 1], powerLevel, bufferSampleRate);
    },
  });

  rec.open(
    function () {
      if (Recorder.WaveView) wave = Recorder.WaveView({ elem: ".recwave" });
      success && success();
    },
    function (msg, isUserNotAllow) {
      console.log((isUserNotAllow ? "UserNotAllow，" : "") + "無法錄音:" + msg);
    }
  );
};

/** 開始錄音 **/
function recStart() {
  // 需先呼叫 recOpen() 開啟錄音後才能調用 start、stop 方法
  console.log("開始錄音");
  pauseAudio();
  recOpen(function () {
    isRecording.value = true;

    // 開始計時
    timer = setInterval(() => {
      recordTime.value += 1;

      // 檢查錄音時間是否超過 60 秒
      if (recordTime.value >= 60) {
        recStop(); // 停止錄音
      }
    }, 1000);

    rec.start();
  });
}


function recStop() {
  rec.stop(
    function (blob, duration) {
      // 產生本地播放 URL
      let localUrl = (window.URL || webkitURL).createObjectURL(blob);
      console.log(blob, localUrl, "時長:" + duration + "ms");

      // 建立音檔 File 物件
      audioFile.value = new File([blob], "recording.mp3", {
        type: "audio/mp3",
      });

      console.log("audioFile", audioFile.value);

      rec.close(); // 釋放資源
      rec = null;

      // // ✅ 顯示音訊播放器與下載連結
      // const container = document.getElementById("audioContainer");
      // container.innerHTML = ""; // 清空之前的

      // 音訊播放器
      const audioPlayer = document.createElement("audio");
      audioPlayer.controls = true;
      audioPlayer.src = localUrl;
      // container.appendChild(audioPlayer);

      // 下載連結
      const downloadLink = document.createElement("a");
      downloadLink.href = localUrl;
      downloadLink.download = "recording.mp3";
      downloadLink.textContent = "⬇️ 下載錄音檔";
      downloadLink.style.display = "inline-block";
      downloadLink.style.marginLeft = "10px";
      // container.appendChild(downloadLink);

      // 語音辨識流程
      if (recordTime.value !== 0) {
        handleAudioToText(); // 語音轉文字
      } else {
        isRecording.value = false;
      }

      clearInterval(timer); // 清除錄音計時器
      recordTime.value = 0;
    },
    function (msg) {
      console.log("錄音失敗：" + msg);
      rec.close();
      rec = null;
    }
  );
}

// function recStart() {
//   if (audio) {
//     audio.pause()
//     audio.currentTime = 0
//     audio = null
//   }
//   if (!('webkitSpeechRecognition' in window)) {
//     alert('你的瀏覽器不支援語音辨識（建議用 Chrome）')
//     return
//   }

//   recognition = new webkitSpeechRecognition()
//   recognition.lang = 'zh-TW'
//   recognition.interimResults = true
//   recognition.maxAlternatives = 1

//   recognition.start()
//   isRecording.value = true

//   recognition.onresult = (event) => {
//     let finalTranscript = ''

//     for (let i = event.resultIndex; i < event.results.length; i++) {
//       const result = event.results[i]
//       if (result.isFinal) {
//         finalTranscript += result[0].transcript
//       }
//     }

//     if (finalTranscript.trim()) {
//       userMessage.value = finalTranscript.trim()
//       sendMessage()
//     }
//   }

//   recognition.onerror = (event) => {
//     console.error('語音辨識錯誤:', event)
//     isRecording.value = false
//   }

//   recognition.onend = () => {
//     isRecording.value = false
//   }
// }

// function recStop() {
//   if (recognition) {
//     recognition.stop()
//   }
//   isRecording.value = false
// }





/** 結束錄音 **/
// function recStop() {
//   rec.stop(
//     function (blob, duration) {
//       // 利用 URL 產生本地檔案位址，不用時需要 revokeObjectURL
//       let localUrl = (window.URL || webkitURL).createObjectURL(blob); // 該 url 只能本地端使用 (例如給 audio.src 進行播放，或是給 a.href download 進行下載)
//       console.log(blob, localUrl, "時長:" + duration + "ms");
//       // rec.close(); // 釋放錄音資源 (若不釋放系統或瀏覽器將持續提示在錄音中)
//       // rec = null;

//       // 將 Blob 轉換為 File 對象
//       audioFile.value = new File([blob], "recording.mp3", {
//         type: "audio/mp3",
//       });

//       console.log("audioFile", audioFile.value);

//       rec.close(); // 釋放錄音資源 (若不釋放系統或瀏覽器將持續提示在錄音中)
//       rec = null;

//       if (recordTime.value !== 0) {
//         handleAudioToText(); // 語音轉文字
//       } else {
//         isRecording.value = false;
//       }

//       clearInterval(timer); // 清空計時秒數
//       recordTime.value = 0;
//     },
//     function (msg) {
//       console.log("錄音失敗：" + msg);
//       rec.close(); // 可以透過 stop 方法的第 3 個參數來自動呼叫 close
//       rec = null;
//     }
//   );
// }



let isVideoPause = ref(true);

let showVoiceItem = ref(true);
const prologue = ref(null);
const showFontSizeMenu = ref(false); // 文字尺寸選單顯示
const fontSizes = ["16", "18", "20", "22", "24", "26", "28", "30"]; // 字體尺寸選項

// 切換文字選單顯示
const toggleFontSizeMenu = () => {
  showFontSizeMenu.value = !showFontSizeMenu.value; // 切換選單顯示
};

// 更改文字尺寸
const changeFontSize = (size) => {
  showVoiceItem.value = false; // 隱藏語音選項

  size = `${size}px`;
  // 修改所有 <p> 和 <li> 元素的文字尺寸
  document.querySelectorAll("p, li, button").forEach((element) => {
    element.style.setProperty("font-size", size);
    // element.style.setProperty("font-size", size, "important"); // 加上 !important
  });

  // updateVoiceItem();
  showFontSizeMenu.value = false; // 選擇後關閉選單
};



// 設定開場白語言


// function playAudio(mp3){
//   let mp3Url = `../..`+mp3;  // 將 mp3 路徑賦值給 mp3Url
//    // 暫停當前音訊
//    if (currentAudio.value) {
//     currentAudio.value.pause();
//     currentAudio.value.currentTime = 0;
//   }
//   console.log(mp3Url)
//     // 播放音檔
//     currentAudio.value = new Audio(mp3Url);
//     console.log( currentAudio.value)
//   setTimeout(() => {
//     currentAudio.value.play(); // 播放音訊
//     isVideoPause.value = true;
//   }, 1000);
// }
let sound = ref(null); // 當前音訊
function playAudio(mp3Url, volume = 1.0) {
  if (sound.value) {
    sound.value.stop(); // 停掉上一段，避免重疊
  }

  sound.value = new Howl({
    src: [mp3Url],
    autoplay: true,
    volume, // 設定音量，預設是 1.0
  });

  sound.value.play();
}

function pauseAudio() {
  if (sound.value && sound.value.playing()) {
    sound.value.pause();
  }
}
let isDragging = false
let dragOffset = { x: 0, y: 0 }
const buttonWidth = 60 // 按鈕寬度
const buttonHeight = 60 // 按鈕高度
const marginRight = 205  // 距離右邊距
const marginBottom = 130 // 距離底部（避免被手機底部UI擋住）

const position = ref({
  x: window.innerWidth - buttonWidth - marginRight,
  y: window.innerHeight - buttonHeight - marginBottom
})

const startDrag = (e) => {
  isDragging = true
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  dragOffset = {
    x: clientX - position.value.x,
    y: clientY - position.value.y,
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag)
  window.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging) return
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY

  position.value = {
    x: clientX - dragOffset.x,
    y: clientY - dragOffset.y,
  }
}

const stopDrag = () => {
  isDragging = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

let recognition


if ('webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.lang = 'zh-TW' // 或 en-US
  recognition.interimResults = false

  recognition.onstart = () => {
    isListening.value = true
  }

  recognition.onend = () => {
    isListening.value = false
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    userMessage.value += transcript
    recognition.stop();
    sendMessage();
  }
} else {
  console.warn('這個瀏覽器不支援語音辨識')
}

function startListening() {
  if (!recognition) return
  recognition.start()
}
</script>

<template>
  <Navbar />
  <main>
    <div class="main-containar">

      <div class="chat-content">
        <div v-if="mapVisible" id="map" class="w-full" style="height: 200px;"></div>
        <section class="sec-chat-area">
          <div ref="chatArea" :style="{ height: mapVisible ? '65vh' : '90vh' }" class="chat-area"
            :class="{ 'area-open': isRotate }">

            <div v-for="message in messages" class="message-content" :key="index"
              :class="{ 'last-message': index === messages.length - 1 }">
              <div v-if="message.label === 'prologue'" ref="prologue">
                <!-- 歡迎詞 -->
                <div class="message d-flex" :class="{
                  'message-out': message.author === 'user',
                  'message-in': message.author !== 'user',
                  animate__fadeInRight: message.author === 'user',
                  animate__fadeInLeft: message.author !== 'user',
                }">
                  <p v-html="message.body"></p>
                </div>
                <!-- <div v-if="message.type === 'confirm'" class="flex gap-4 mt-3 ml-4 justify-start">
                  <button @click="sendMessage('是')" class="bg-green-500 text-white px-3 py-1 rounded">是</button>
                  <button @click="handleConfirm('否')" class="bg-gray-400 text-white px-3 py-1 rounded">否</button>
                </div> -->
              </div>

              <!-- <div > -->
              <div v-if="message.label === 'text'" class="message animate__animated" :class="{
                'message-out': message.author === 'user',
                'message-in': message.author !== 'user',
                animate__fadeInRight: message.author === 'user',
                animate__fadeInLeft: message.author !== 'user',
              }">
                <p v-html="message.body"></p>
              </div>
              <div v-if="message.type === 'loction'" class="flex flex-col gap-4 mt-3">
                <div v-for="(item, index) in message.body" :key="item.name" @click="selectPickup(item)"
                  class="pickup-box rounded-lg px-4 py-3 cursor-pointer hover:opacity-90 transition">
                  <div class="font-semibold text-xl text-[#D61718]">上車地點{{ item.id }}</div>
                  <div class="text-[#D61718] text-xl">{{ item.name }}</div>
                </div>
              </div>

              <div v-if="message.type === 'confirm'" class="flex gap-4 mt-3 ml-4 justify-start">
                <button @click="sendMessage('是')" class="bg-green-500 text-white px-8 py-3 text-xl rounded">
                  是
                </button>
                <button @click="sendMessage('否')" class="bg-gray-400 text-white px-8 py-3 text-xl rounded">
                  否
                </button>
              </div>

              <!-- </div> -->

              <div v-if="message.label === 'line'" class="line-item">
                <img src="../assets/img/line_oa_qrcode.png" alt="Line OA Qrcode" />
              </div>



              <p class="my-5 text-center font-weight-medium" v-if="message.label === 'text2'" v-html="message.text2">
              </p>
            </div>
            <div class="h-[50px]" style="padding: 50px; "></div>
            <!-- <p class="my-5 text-center font-weight-medium"> 請點擊上方錄音按鈕，開始聊天！ </p> -->
          </div>
        </section>


        <!-- 底部選單 -->
        <div class="menubox">
          <div ref="menu" class="menu">
            <div class="align-center position-relative">
              <div class="w-100 d-flex align-center justify-center">
                <!-- 對話輸入框 -->
                <form class="chat-inputs" :class="{ 'd-none': !showInput }">
                  <!-- 文字尺寸選單 -->

                  <!-- <div v-if="inputMode === 'text'" cclass="relative w-full keyboard">
                    <textarea v-model="userMessage" :placeholder="t('type_message')" rows="2"
                      class="w-full border border-gray-300 rounded-bl-xl rounded-br-xl p-3 pr-12"></textarea>

         
                    <button type="submit" @click="sendMessage()"
                      class="absolute bottom-16 right-5   p-2 rounded-full  transition paperplan">
                      <img width="30" src="../assets/img/paper-plane-solid.svg" alt="送出" />
                    </button>
                    <div class="text-end">
                      <button @click="inputMode = 'voice'"
                        class=" bottom-1 right-1 p-2 shadow rounded-full hover:bg-gray-100 transition">
                        <img width="30" src="../assets/img/mic.png" alt="語音輸入" />
                      </button>
                    </div>
                  </div> -->

                  <div v-if="inputMode === 'voice'" class="relative">
                    <div ref="micButton" class="fixed z-50"
                      :style="{ top: `${position.y - 30}px`, left: `${position.x}px` }">
                      <div class="mic-drag-wrapper floating draggable-button">
                        <!-- 拖拉區（不含按鈕） -->
                        <div class="drag-handle-area text-center" @mousedown.stop="startDrag"
                          @touchstart.stop.prevent="startDrag">
                          <Bars3Icon class="absolute top-0 left-1/2 w-6 h-6 text-gray-900" />
                        </div>



                        <div @click="startListening" class="btn-item">
                          <button type="button" class="submit mic select-none"
                            style="pointer-events: auto; -webkit-user-select: none; -webkit-touch-callout: none; "
                            :class="isListening ? 'text-green animate-pulse border-green' : 'text-gray-600  text-red border-red'">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                              stroke="currentColor" class="size-10">
                              <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                            </svg>
                          </button>
                        </div>

                        <!-- 錄音按鈕 -->
                        <!-- <div v-if="!isRecording" @click="recStart" class="btn-item">
                            <button type="button" class="submit mic select-none"
                              style="pointer-events: auto; -webkit-user-select: none; -webkit-touch-callout: none;">
                              <img width="40" :src="micImg" alt="語音輸入" class="pt-1 pointer-events-none select-none" />
                            </button>
                          </div>

                          

                          <div v-else @click="recStop" class="btn-item">
                            <button type="submit" class="submit voice" :disabled="videoLoading">
                              <img width="40" :src="micImg" alt="語音輸入中" class="pt-1 pointer-events-none select-none" />
                              <v-icon icon="mdi-square" size="large" color="#34A853"></v-icon>
                            </button>
                          </div> -->

                      </div>
                      <p class="text-center mt-3" :style="{ color: '#6B7280' }">
                        {{ isRecording ? '輕觸可停止語音辨識' : '輕觸開始語音辨識' }}
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss">
.leaflet-popup-content {
  font-size: 18px;
  width: 80px;
}

// .label-text {
//   width: 30px;
//   margin-top: 4px;
//   background-color: #fff;
//   color: #D61718;
//   font-size: 20px;
//   padding: 10px;
//   border-radius: 6px;
//   box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
//   font-weight: 600;
//   // white-space: nowrap;
// }

.marker-icon {
  width: 35px !important;
}


.keyboard {
  img {
    filter: invert(14%) sepia(77%) saturate(4533%) hue-rotate(346deg) brightness(104%) contrast(94%);
  }
}

.paperplan {
  img {
    filter: invert(14%) sepia(77%) saturate(4533%) hue-rotate(346deg) brightness(104%) contrast(94%);
  }
}

.mic {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  // border: 3px solid #D61718;
  margin: 10px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;


  img {
    filter: invert(14%) sepia(77%) saturate(4533%) hue-rotate(346deg) brightness(104%) contrast(94%);

  }
}

.airplane {
  img {
    filter: invert(77%) sepia(26%) saturate(1%) hue-rotate(343deg) brightness(100%) contrast(110%);

  }
}

.voice {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #34A853;
  background-color: white;
  margin: 10px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;

  img {
    filter: invert(58%) sepia(15%) saturate(1932%) hue-rotate(83deg) brightness(91%) contrast(83%);
  }
}

.custom-border-t {
  border-top: 1px solid #D61718 !important;
}

.text-red{
color:#D61718;
}

.text-green{
  color:#34A853;
}

.border-green{
  border: 3px solid #34A853;
}

.border-red{
      border: 3px solid #D61718;
}

.footer {
  width: 50%;
  margin: 0 auto;

  span {
    color: #7F7F7F;
  }
}

main {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #D8D8D8;
  // background-color: rgba(0, 0, 0, 0.6);
  background-blend-mode: multiply;
  background-size: cover;
  background-position: center center;
}

.main-btn {
  padding: 16px 70px;
  font-size: 22px;
  font-weight: 600;
  border: none;
  border-radius: 100px;
  letter-spacing: 2px;
  color: white;
  background-color: var(--main-color);
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    opacity: 0.7;
  }
}

.lang-content {
  display: flex;
  flex-direction: column;

  .main-btn {
    margin-bottom: 40px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.main-containar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;

  .video-content {
    height: 94vh;
    display: flex;
    justify-content: center;
    transform: scale(1);

    video {
      width: 100%;
      height: 100%;
      position: fixed;
      top: 55px;
      left: 0;
      right: 0;
      z-index: 10;

      @media (min-width: 1441px) {
        width: 54%;
      }

      @media (min-width: 1281px) and (max-width: 1440px) {
        width: 54%;
      }

      @media (min-width: 1025px) and (max-width: 1280px) {
        width: 50%;
      }

      @media (max-width: 575px) {
        top: 15px;
      }

      @media (max-width: 375px) {
        top: 40px;
      }
    }

    .control-btn {
      width: 33px;
      height: 33px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      z-index: 50;
      top: 75px;
      right: 15px;
      background: var(--main-color);
      border: none;
      border-radius: 100px;

      @media (min-width: 1440px) {
        width: 50px;
        height: 50px;
      }

      img {
        width: 25px;
        filter: invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%);

        @media (min-width: 1440px) {
          width: 40px;
        }
      }
    }

    .control-item {
      display: flex;
      justify-content: end;
      flex-direction: column;
      z-index: 10;
      position: absolute;
      bottom: 35px;

      @media (max-width: 375px) {
        height: 30vh;
      }

      p {
        color: red;
        font-size: 1.5rem;
        font-weight: bold;
        letter-spacing: 1px;
        text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff,
          1px 1px 0 #fff;

        @media (max-width: 1440px) {
          font-size: 1.25rem;
        }

        @media (max-width: 1024px) {
          font-size: 0.875rem;
        }
      }

      .fixed-mic-btn {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: transparent;
        z-index: 1000;
      }

      .btn-item {
        width: 100%;
        height: 100px;
        padding: 30px;
        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;

        @media (max-width: 1440px) {
          height: 70px;
        }

        @media (max-width: 575px) {
          height: 50px;
        }
      }
    }
  }

  .chat-content {
    width: 100%;
    // height: 100vh;
    margin-top: 7vh;
    letter-spacing: 1px;
    border-radius: 10px 10px 0 0;


    // @media (max-width: 1920px) {
    //   height: 75vh;
    //   top: 115px;
    // }

    // @media (max-width: 1440px) {
    //   top: 110px;
    // }

    @media (max-width: 1024px) {
      width: 100%;
      height: auto;
      position: relative;
      top: unset;
      right: unset;
    }

    .headline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 25px;
      border-radius: 15px 15px 0 0;
      background-color: var(--main-color);

      h1 {
        font-size: 1.125rem;
        font-weight: 500;
        color: white;

        @media (min-width: 1440px) {
          font-size: 1.6rem;
        }

        @media (min-width: 1080px) {
          font-size: 1.3rem;
        }

        @media (max-width: 375px) {
          font-size: 0.875rem;
        }
      }

      button {
        padding-top: 3px;
        display: flex;
        align-items: center;
        border: none;
        background-color: transparent;
        cursor: pointer;

        img {
          width: 25px;
          height: 20px;
          transition: all 0.3s;
          transform: rotate(0deg);

          &.rotate {
            transform: rotate(180deg);
          }
        }
      }
    }

    .chat-area {
      display: flex;
      flex-direction: column;
      background: #fff;
      // height: 70vh;
      padding: 0 1em 1em;
      overflow-x: hidden;
      overflow-y: auto;
      transition: all 0.3s;
      // border-bottom-left-radius: 16px;
      // border-bottom-right-radius: 16px;

      h1 {
        // margin-top: 1rem;
        // text-align: center;
        // font-size: 2rem;
        // font-weight: 600;
        // color: var(--main-color);
        // letter-spacing: 2px;
      }
    }

    .message-content {
      display: flex;
      flex-direction: column;

      .message {
        max-width: 90%;
        font-size: 1.6rem;
        border-radius: 20px;
        padding: 0.5em 1.2em;
        position: relative;
        white-space: pre-line;
        box-shadow: 2px 4px 5px rgba(0, 0, 0, 0.5);

        &:first-child {
          margin-top: 0;
        }

        @media (max-width: 1280px) {
          max-width: 90%;
          font-size: 1.3rem;
        }

        @media (max-width: 600px) {
          font-size: 1.4rem;

        }

        &.message-out {
          margin-left: auto;
          background: #D61718;
          color: white;
        }

        &.message-in {
          margin-right: auto;
          background: #fff;
          color: black;
        }

        &.message-in,
        &.message-out {
          margin-top: 20px;
        }
      }

      .voice-item {
        width: 100%;
        display: flex;
        position: absolute;
        // right: -205px;
        left: 0;
        bottom: 0;

        button {
          display: flex;
          align-items: center;
          padding: 0.3rem 1rem;
          font-size: 16px;
          color: var(--main-color);
          letter-spacing: 1px;
          background-color: transparent;
          border-radius: 100px;
          border: 2px solid var(--main-color);
          transition: all 0.2s;

          &:hover {
            color: #fff;
            background-color: var(--main-color);

            img {
              filter: invert(100%) sepia(84%) saturate(2%) hue-rotate(350deg) brightness(110%) contrast(101%);
            }
          }

          img {
            filter: invert(15%) sepia(57%) saturate(4442%) hue-rotate(293deg) brightness(88%) contrast(111%);
          }
        }
      }

      .line-item {
        margin-top: 20px;

        img {
          max-width: 300px;
        }
      }

      .like-btn {
        position: absolute;
        right: -95px;
        bottom: 0;

        button {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 100px;
          border: 2px solid var(--sub-color);
          box-shadow: 1px 1px 3px #ccc;

          img {
            width: 16px;
            filter: invert(100%) sepia(32%) saturate(1978%) hue-rotate(187deg) brightness(78%) contrast(108%);
          }
        }
      }
    }

    .chat-inputs {
      width: 100%;
      // height: 11vh;
      // display: flex;
      // align-items: center;
      padding: 10px 10px 0px 10px;

      // background-color: #fff;


      textarea {
        width: 100%;
        font-size: 24px;
        border: none;
        // background: #fff;
        border-radius: 25px;
        padding: 0.5rem 1rem; // ← ⭐ 關鍵：內距讓文字不會貼邊

        &:focus-visible {
          outline: none;
        }
      }

      button {
        // border: none;
        // background: white;
        cursor: pointer;
        // font-size: 16px !important;


        &:hover {
          img {
            opacity: 0.7;
          }
        }


      }

      ::placeholder {
        font-size: 24px;
        font-weight: 500;
        color: #7F7F7F;
        opacity: 1;
        // text-align: center;
        /* Firefox */
        letter-spacing: 1px;

      }

      ::-ms-input-placeholder {
        /* Edge 12 -18 */
        color: var(--sub-color);
      }


    }
  }
}

.video-progress {
  position: absolute;
  left: 50%;
  top: 40%;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.v-expansion-panel-text {
  font-size: 0.875rem;
  line-height: 1.7;
}

.sec-chat-area {
  padding: 10px 10px 0px 10px;
}

.menubox {
  padding: 0px 10px 10px 10px;
}



/* 底部選單 */
.menu {
  // border-top: 1px solid #e5e5e5;
  // background: #fff;
  position: fixed;
  z-index: 300;
  left: 0%;
  bottom: 20px;
  padding: 15px 15px 15px 15px;
  right: 0;
  color: var(--text-color);
  width: 100%;
  // border-radius: 30%;

  @media (min-width: 1440px) {
    position: static;
  }

  @media (min-width: 1281px) and (max-width: 1440px) {
    position: static;
  }

  @media (min-width: 1025px) and (max-width: 1280px) {
    position: static;
  }

  img {
    // padding-top: 5px;
    object-fit: contain;
    transition: all 0.3s;
    // filter: invert(15%) sepia(57%) saturate(4442%) hue-rotate(293deg) brightness(88%) contrast(111%);
  }

  &.hide-menu table {
    height: 0;
    z-index: -1;
  }

  .icon {
    width: 80px;

    @media (max-width: 767px) {
      width: 50px;
    }
  }

  .question-btn {
    color: var(--main-color);
    font-size: 1.25rem;
    font-weight: 500;
    letter-spacing: 0.1rem;

    @media (max-width: 414px) {
      font-size: 1rem;
    }
  }
}

.lang-select {
  position: absolute;
  z-index: 100;
  bottom: 20px;
  right: 6px;
  // width: 150px;
  display: flex;
  flex-direction: column;

  @media (max-width: 575px) {
    width: 65px;
  }

  button {
    padding: 0.2rem 0.3rem;
    font-size: 0.875rem;
    color: #fff;
    background-color: var(--main-color);
    border: 4px solid transparent;
    border-radius: 100px;
    margin-bottom: 0.8rem;
    letter-spacing: 1px;

    &.active {
      border: 2px solid #fff;
    }
  }
}

.rec-btn {
  width: 5vw;
  height: 5vw;

  @media (min-width: 1440px) {
    width: 4vw !important;
    height: 4vw !important;
  }

  .v-icon--size-large {
    @media (min-width: 1440px) {
      font-size: 2.5vw;
    }
  }
}

.confirm-item {
  button {
    padding: 10px 20px;
    border-radius: 10px;
    margin-top: 1rem;
    letter-spacing: 1px;
    color: #fff;
    background-color: var(--main-color);
    transition: all 0.3s;

    &:hover {
      opacity: 0.7;
    }
  }
}

.video-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  @media (max-width: 1024px) {
    height: 60vh;
  }

  .video-mask-overlay {
    p {
      color: white;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
    }
  }
}

#map {

  flex: 1;
  width: 100%;
  z-index: 0;
  min-height: 200px;

}

.mark {
  width: 16px;
  height: 16px;
  background-color: #2563eb;
  /* Tailwind 的 bg-blue-600 對應色碼 */
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
}

.custom-center-marker {
  z-index: 1000;
}

.last-message {
  padding-bottom: 120px;
}

.pickup-box {
  border: 2px solid #D61718;
  cursor: pointer;
  transition: opacity 0.3s;
}

// .marker-wrapper {
//   position: relative;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
// }

// .label-text {
//   background: white;
//   padding: 2px 6px;
//   border-radius: 4px;
//   // font-size: 12px;
//   margin-bottom: 4px;
// }

.marker-wrapper {
  position: relative;
  width: 30px;
  height: 40px;
}

.marker-icon {
  width: 100%;
  height: auto;
  display: block;
}

.label-text {
  position: absolute;
  top: 3px;
  /* 根據你圖標的圖形微調 */
  left: 60%;
  transform: translateX(-50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 2px #000;
  /* 加一點黑色描邊，增加對比 */
  pointer-events: none;
}

.marker-icon {
  width: 30px;
  height: 35px;
}

.leaflet-popup-content {
  margin: 5px 15px 5px 15px;
}

.draggable-mic {
  position: fixed;
  z-index: 9999;
  cursor: grab;
}

.mic-button {
  background-color: #d61718;
  border-radius: 9999px;
  padding: 10px;
  border: 2px solid #d61718;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);

}



.drag-handle-area {
  width: 85%;
  height: 50px;
  cursor: grab;
  background: transparent;
  position: absolute;
  z-index: 998;
  bottom: -18px;
  left: 0;
  font-weight: 700;
  letter-spacing: 3px;
  // pointer-events: none;

}

.draggable-button:hover {
  cursor: grab;
}

.draggable-button:active {
  cursor: grabbing;
}


@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.floating {
  animation: float 2s ease-in-out infinite;
}

.text-gray {
  color: #6B7280;
}

.mic-drag-wrapper {
  width: 150px;
  height: 150px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.05);
  /* 微淡灰提示背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
}

.mic-drag-wrapper:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
