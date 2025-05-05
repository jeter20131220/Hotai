<script setup>
import { ref, reactive, onMounted, watch, nextTick } from "vue";
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
// QR Code
// import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from "vue-qrcode-reader";
// Components
import Navbar from "../components/Navbar.vue";
import {Howl, Howler} from 'howler';

const { t, locale } = useI18n();
const route = useRoute();
const routeParam = ref(null);



const question = reactive([
  "糖尿病初期症狀有哪些？",
  "外食族怎麼吃可以幫助控糖？",
  "如果我餐與餐間吃點心，這樣下一餐飯前血糖會準嗎？",
]);

onMounted(() => {
  getKeyFromUrl();

  messages.value.push({
    label: "prologue",
    author: "ai",
    body: t("prologue"),
  });

  // question.map((item) => {
  //   messages.value.push({
  //     label: "question",
  //     author: "ai",
  //     body: item,
  //   });
  // });

  // updateVoiceItem();
  window.addEventListener("resize", handleResize);

  // 判斷是否以 LINE 瀏覽器開啟網頁
  document.addEventListener("DOMContentLoaded", function () {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("line")) {
      if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
        alert("請選擇『在 Safari 中開啟』以獲得更佳的使用體驗。");
      } else {
        window.open(
          "intent://cmm.ai/nhri/#Intent;scheme=https;package=com.android.chrome;end;",
          "_self"
        );
      }
    }
  });
});

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

const locations = {
  亞東醫院: "https://maps.app.goo.gl/ktAqJbXxc16niRR8A",
  赤豐蔬坊: "https://maps.app.goo.gl/6kiQsHMY1LndEGoY6",
  正慧素食館: "https://maps.app.goo.gl/j8817eNQg1KHqur88",
  雙月食品社: "https://maps.app.goo.gl/YN1NaJ5h7kCwrnVP6",
  蔬園素食: "https://maps.app.goo.gl/A1TqKb8vPtHHSqBd6",
  "72度C舒肥健康餐/水煮餐": "https://maps.app.goo.gl/R6jo6UQETuTEST4J6",
  原味私廚: "https://maps.app.goo.gl/JsmnV9sCejmqv9BK6",
};

// 將符合的字串加上 a 標籤
function addHyperlink(text, locations) {
  let result = text;
  for (const [name, url] of Object.entries(locations)) {
    const regex = new RegExp(name, "g"); // 全部出現的名稱都替換
    result = result.replace(
      regex,
      `<a href="${url}" target="_blank" style="color: var(--main-color);">${name}</a>`
    );
  }
  return result;
}

let appoinmentInfo = reactive({}); // 掛號資料

// 傳送訊息
async function sendMessage() {
  console.log("sendMessage", userMessage.value);

  let message = userMessage.value;
  userMessage.value = ""; // 清空輸入框

  if (message !== "") {
    questionList.value.push({
      q: !message ? "" : message,
      a: "",
    });

    if (message && message !== "") {
      // 使用者訊息
      messages.value.push({
        label: "text",
        author: "user",
        body: message,
      });

      messages.value.push({
        label: "text",
        author: "ai",
        body: "回覆中…",
      });
    } else {
      messages.value.push({
        label: "text",
        author: "ai",
        body: "抱歉，我沒有聽得很清楚，麻煩請您再說一次，謝謝。",
      });

      videoLoading.value = false;

      return;
    }

    scrollToBottom();
  } else {
    return;
  }

  let lang = getLang();

  let url = `https://cmm.ai:8068/chat?message=${message}`;
  // let url = `https://cmm.ai:9999/qa?message=${message}&language=${lang}`;

  let data = {
    chat_history: questionList.value,
  };

  try {
    videoLoading.value = true;
    const response = await axios.post(url, questionList.value);
    console.log("response", response);
    console.log("回覆：", response.data.message);

    const hyperlinkMessage = addHyperlink(response.data.message, locations); // 加上 hyperlink
    console.log("hyperlinkMessage", hyperlinkMessage);

    if (response.status === 200) {
      messages.value.splice(-1, 1); // 移除回覆中
      videoLoading.value = false;
      console.log("response", response);

      if ("appoinment_info" in response.data) {
        appoinmentInfo = response.data.appoinment_info;

        console.log("appoinmentInfo >>", appoinmentInfo);

        setTimeout(() => {
          messages.value.push({
            label: "btn",
            author: "ai",
            body: "確認掛號資料 OK",
          });
        }, 1000);
      }

      // 回傳影片
      if (response.data.Answer !== "line_oa" && response.data.video_cache) {

        if (response.data.video_cache !== "") {
          const mp3Path=response.data.video_cache;
          
          videoLoading.value = false;

          const mp3 = await import(`../../src/assets/img/mp3url/${mp3Path}.wav`);
          playAudio(mp3.default);  // 將 mp3 路徑傳遞給 playAudio 函數
        }

        // // 暫停當前音訊
        // if (currentAudio.value) {
        //   currentAudio.value.pause();
        //   currentAudio.value.currentTime = 0;
        //   currentAudio.value = null;
        // }

        // setTimeout(() => {
        //   isVideoPause.value = true;
        //   videoPlay();
        // }, 500);
      } else if (response.data.message !== "line_oa") {
        handleTTS(response.data.message); // 取得語音回覆
      }
      setTimeout(() => {
        messages.value.push({
          id: response.data.history_id,
          label: "text",
          author: "ai",
          body: hyperlinkMessage,
        });

        scrollToBottom();
      }, 300);

      questionList.value[questionList.value.length - 1].a =
        response.data.message;
      console.log("questionList", questionList.value);
    }

    console.log("messages.value", messages.value);
  } catch (error) {
    console.log("error", error);
    messages.value.splice(-1, 1); // 移除回覆中
    messages.value.push({
      label: "text",
      author: "ai",
      body: "抱歉，我沒有聽得很清楚，麻煩請您再說一次，謝謝。",
    });
    videoLoading.value = false;
  }
}

let hideMenu = ref(true); // 底部選單
let showInput = ref(true); // 輸入框

function getLang() {
  let lang = localStorage.getItem("lang");
  let langVal = "";

  switch (lang) {
    case "zh-tw":
      langVal = "zh";
      break;
    case "en-us":
      langVal = "en";
      break;
    case "ja-jp":
      langVal = "ja";
      break;

    default:
      break;
  }

  return langVal;
}

let video = ref(null);

function videoPlay() {
  if (video.value) {
    if (videoSrc.value !== videoMuteSources.value) {
      video.value.loop = false;
    } else {
      video.value.loop = true; // 設置循環播放
    }
    video.value.load();
    video.value.play();
  }
}

// 底部選單
const menu = ref(null);
const menuHeight = ref(0);

let isRotate = ref(false);
let isLanguagePage = ref(true);
let selectLang = ref("");
let chatLoading = ref(true);

const handleResize = () => {
  updateVoiceItem();
};

function chooseLang(lang) {
  console.log("選擇語言：", lang);
  selectLang.value = lang;
  isLanguagePage.value = false;
  locale.value = lang; // i18n locale
  localStorage.setItem("lang", lang);

  messages.value.push({
    label: "text",
    author: "ai",
    body: t("prologue"),
  });

  // 判斷語言修改 title
  const language = localStorage.getItem("lang") || "zh-tw";
  console.log("language", language);
  if (language === "zh-tw") {
    document.title = "ChoozMo AI智能客服";
  } else if (language === "en-us") {
    document.title = "ChoozMo AI Intelligent Customer Service";
  }

  // 影片路徑
  loadVideoSources();
  if (language === "zh-tw") {
    videoSrc.value = videoSources.value;
    hideAnchorPrologue.value = true;
    setTimeout(() => {
      videoPlay();
    }, 500);
  } else if (language === "ja-jp") {
    handleTTS(
      "こんにちは、スマートカスタマーサービスをご利用いただきありがとうございます。どのようなご用件でお手伝いできますか？"
    );
  }
}

// 動態引入視頻文件
const videoSources = ref(""); // 開場白影片(中)
const videoSourcesJp = ref(""); // 開場白影片(日)
const videoMuteSources = ref(""); // 點頭影片(靜音)
const videoSpeakSources = ref(""); // 動嘴型影片

const loadVideoSources = async () => {
  videoSources.value = "https://cmm.ai/chatbot/video/aivoice.mp4";
  videoSourcesJp.value = "";
  videoMuteSources.value = "https://cmm.ai/chatbot/video/mute.mp4";
  videoSpeakSources.value = "https://cmm.ai/chatbot/video/nhri/speaks2.mp4";
};

let videoSrc = ref("");
let hideAnchorPrologue = ref(false); // 顯示開場白 or 點頭影片

let langList = reactive([
  {
    lang: "中文",
    value: "zh-tw",
  },
  {
    lang: "日本語",
    value: "ja-jp",
  },
  // {
  //   lang: "English",
  //   value: "en-us",
  // },
]);

function getImageUrl(name) {
  return new URL(`../assets/img/icon/${name}`, import.meta.url).href;
}

let showAnchor = ref(false); // AI 主播影片
let currentAudio = ref(null); // 當前音訊

// 文字轉語音 (TTS)
async function handleTTS(message) {
  console.log("handleTTS", message);

  let audioLang; // 音訊語言
  let lang = localStorage.getItem("lang");
  console.log("lang", lang);

  switch (lang) {
    case "zh-tw":
      audioLang = "zh-TW";
      // audioLang = "cmn-TW";
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
  let url = `https://cmm.ai:9001/azure/text-to-speech?language_code=${audioLang}&gender=Female`;
  // let url = `https://cmm.ai:9001/gcp/text-to-speech?language_code=${audioLang}&gender=female`;

  const formData = new FormData();
  formData.append("text", message);

  try {
    const response = await axios.post(url, formData, { responseType: "blob" });
    console.log("TTS response", response);

    const blob = new Blob([response.data], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(blob);
    console.log("audioUrl", audioUrl);
    cutVideo(audioUrl); // 剪接影片
  } catch (error) {
    console.log("error", error);
  }
}

let videoLoading = ref(false);
let isAudioPlaying = ref(false); // 音訊播放狀態

// 取得語音回覆 mp4
async function cutVideo(audioUrl) {
  videoSrc.value = videoSpeakSources.value;
  video.value.loop = true; // 開啟循環播放

  video.value.load(); // 重新讀取影片
  video.value.play(); // 播放影片

  // 暫停當前音訊
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value.currentTime = 0;
  }

  // 播放音檔
  currentAudio.value = new Audio(audioUrl);
  setTimeout(() => {
    currentAudio.value.play(); // 播放音訊
    isVideoPause.value = true;
  }, 1000);
  videoLoading.value = false;

  console.log("isVideoPause.value", isVideoPause.value);

  // 監聽音訊播放結束
  currentAudio.value.addEventListener("ended", onAudioEnded);
  // 監聽音訊播放狀態
  currentAudio.value.addEventListener("play", onAudioPlay);
  currentAudio.value.addEventListener("pause", onAudioPause);
}

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

  let url = `https://cmm.ai:8068/whisper/tai_gi`;

  const formData = new FormData();
  formData.append("file", audioFile.value);

  try {
    console.log("audioFile.value", audioFile.value);
    const response = await axios.post(url, formData);
    console.log("語音轉文字 response", response);

    userMessage.value = response.data.message;

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
    type: "mp3",
    sampleRate: 16000,
    bitRate: 16,
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
      // 使用者未授權或不支援
      console.log((isUserNotAllow ? "UserNotAllow，" : "") + "無法錄音:" + msg);
    }
  );
};

/** 開始錄音 **/
function recStart() {
  togglePause("pause"); // 暫停影片音訊
  // 需先呼叫 recOpen() 開啟錄音後才能調用 start、stop 方法
  console.log("開始錄音");

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

/** 結束錄音 **/
function recStop() {
  videoLoading.value = true;
  rec.stop(
    function (blob, duration) {
      // 利用 URL 產生本地檔案位址，不用時需要 revokeObjectURL
      let localUrl = (window.URL || webkitURL).createObjectURL(blob); // 該 url 只能本地端使用 (例如給 audio.src 進行播放，或是給 a.href download 進行下載)
      console.log(blob, localUrl, "時長:" + duration + "ms");
      // rec.close(); // 釋放錄音資源 (若不釋放系統或瀏覽器將持續提示在錄音中)
      // rec = null;

      // 將 Blob 轉換為 File 對象
      audioFile.value = new File([blob], "recording.mp3", {
        type: "audio/mp3",
      });

      console.log("audioFile", audioFile.value);

      rec.close(); // 釋放錄音資源 (若不釋放系統或瀏覽器將持續提示在錄音中)
      rec = null;

      if (recordTime.value !== 0) {
        handleAudioToText(); // 語音轉文字
      } else {
        isRecording.value = false;
      }

      clearInterval(timer); // 清空計時秒數
      recordTime.value = 0;
    },
    function (msg) {
      console.log("錄音失敗：" + msg);
      rec.close(); // 可以透過 stop 方法的第 3 個參數來自動呼叫 close
      rec = null;
    }
  );
}

let videoCacheData = ref({});

async function getVideoCache(messages) {
  // let url = `https://cmm.ai:9999/video_cache?client_message=${messages}`;

  let url = `https://cmm.ai:9999/video_cache?client_message=${messages}&language=ch`;

  try {
    const response = await axios.post(url);
    console.log("response_cache", response);
    console.log("response.status", response.status);
    if (response.data.state === 200) {
      videoCacheData.value = response.data.message[0];
      console.log("videoCacheData.value", videoCacheData.value);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("error", error);
  }
}

// 播放 Video Cache
function handleVideoCache() {
  console.log("播放 Video Cache", videoCacheData.value);
  // AI 客服回傳訊息
  messages.value.push({
    label: "text",
    author: "ai",
    body: videoCacheData.value.answer,
  });

  if (videoCacheData.value.video_url === null) {
    handleTTS(videoCacheData.value.answer);
    return;
  }
  // 播放 Cache 影片
  videoSrc.value = `https://cmm.ai:9999${videoCacheData.value.video_url}`;
  video.value.loop = false;
  video.value.load();

  // 清空音訊
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value.currentTime = 0;
    currentAudio.value = null;
  }

  video.value.play();

  isVideoPause.value = true;

  setTimeout(() => {
    videoLoading.value = false;
  }, 1000);
}

let isVideoPause = ref(true);

// AI 主播影片播放 & 暫停
function togglePause(val) {
  if (val === "pause") {
    // video.value.pause();
    isVideoPause.value = false;

    if (video.value) {
      video.value.pause();
    }
    if (currentAudio.value) {
      currentAudio.value.pause(); // 暫停音訊
    }
  } else {
    isVideoPause.value = true;

    if (video.value) {
      video.value.play();
    }
    if (currentAudio.value) {
      currentAudio.value.play(); // 播放音訊
      currentAudio.value.addEventListener("ended", onAudioEnded);
    }
  }
}

// 掛號
async function startAppoint() {
  let url = "https://cmm.ai:9999/start_appoint";

  try {
    const response = await axios.post(url, appoinmentInfo);
    console.log("掛號 response", response);

    if (response.status === 200) {
      handleTTS(response.data.message);
      messages.value.push({
        label: "text",
        author: "ai",
        body: response.data.message,
      });
    }
  } catch (error) {
    console.log("error", error);
  }
}

const isLiked = ref(false);
const isDisliked = ref(false);
// 使用物件管理每個 message 的喜好狀態
const likeStatus = reactive({});

// 切換喜歡狀態
const toggleLike = (id) => {
  if (!likeStatus[id]) {
    likeStatus[id] = { isLiked: false, isDisliked: false };
  }

  likeStatus[id].isLiked = !likeStatus[id].isLiked;
  if (likeStatus[id].isLiked) {
    likeStatus[id].isDisliked = false;
  }

  setQuality(id);
};

// 切換不喜歡狀態
const toggleDislike = (id) => {
  if (!likeStatus[id]) {
    likeStatus[id] = { isLiked: false, isDisliked: false };
  }

  likeStatus[id].isDisliked = !likeStatus[id].isDisliked;
  if (likeStatus[id].isDisliked) {
    likeStatus[id].isLiked = false;
  }

  setQuality(id);
};

// 回覆品質
async function setQuality(id) {
  console.log("likeStatus", likeStatus);

  let quality;

  if (likeStatus[id].isLiked) {
    quality = true;
  } else {
    quality = false;
  }

  let url = `https://cmm.ai:9999/response_quality?history_id=${id}&is_response_good=${quality}`;

  try {
    const response = await axios.post(url);
    console.log("回覆品質", response);
  } catch (error) {
    console.log("error", error);
  }
}

// Line OA 解密
const base64Ciphertext = ref(null);
const aesKey = "03e1390daed34fcb8dad00a74761ec1f"; // AES-256 需要 32 字元長的密鑰
const aesIv = "2f497cc4c692bc97"; // CBC 模式需要 16 字元的 IV

// AES 解密
async function decryptAES256CBCBase64(ciphertext, key, iv) {
  try {
    // Base64 解碼
    const encryptedBytes = Uint8Array.from(atob(ciphertext), (c) =>
      c.charCodeAt(0)
    );

    // 將密鑰和 IV 轉換為 CryptoKey 和 ArrayBuffer
    const aesKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key),
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const ivBuffer = new TextEncoder().encode(iv);

    // 解密
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivBuffer },
      aesKey,
      encryptedBytes
    );

    // 解密完成，轉回字串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("解密失敗：", err.message);
    return `解密失敗：${err.message}`;
  }
}

// 從 URL 取得 key 並解密
function getKeyFromUrl() {
  let key = route.query.key; // 直接從路由取值
  if (key) {
    key = decodeURIComponent(key).replace(/ /g, "+"); // 將空格替換回 +
    base64Ciphertext.value = key;
    handleDecryption();
  } else {
    console.log("URL 中未找到 key 參數");
  }
}

let plaintext = ref(null);

// 解密處理
async function handleDecryption() {
  if (base64Ciphertext.value) {
    plaintext.value = await decryptAES256CBCBase64(
      base64Ciphertext.value,
      aesKey,
      aesIv
    );

    plaintext.value = JSON.parse(plaintext.value);

    console.log("解密：", plaintext.value);
  } else {
    console.log("Base64 密文為空");
  }
}

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
function setVoice(item) {
  console.log("設定開場白語言", item);
  let mp3Url;
  if (item === "國語") {
    mp3Url = "https://cmm.ai:9999/static/introduction.mp3";
  } else {
    mp3Url = "https://cmm.ai:8111/tts_folder/20241226135909_nuskd.mp3";
  }

  // 暫停當前音訊
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value.currentTime = 0;
  }

  // 播放音檔
  currentAudio.value = new Audio(mp3Url);
  setTimeout(() => {
    currentAudio.value.play(); // 播放音訊
    isVideoPause.value = true;
  }, 100);
}

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
function playAudio(mp3Url) {
  sound.value = new Howl({
      src: [mp3Url],
      format: ["wav"], 
      autoplay: true, 
    });

    sound.value.play();
  // // 檢查 currentAudio 是否已經被初始化
  // if (!currentAudio.value) {
  //   // 如果還沒有，則初始化並設置音頻來源
  //   currentAudio.value = new Audio(mp3Url);
  // } else {
  //   // 如果已經存在，就更新音源並重置時間
  //   currentAudio.value.src = mp3Url;
  //   currentAudio.value.currentTime = 0;  // 重置播放時間
  // }

  // // 播放音頻
  // currentAudio.value.play().catch((err) => {
  //   console.error('播放音頻時發生錯誤：', err);
  // });
}




</script>

<template>
  <Navbar />
  <main>
    <div class="main-containar"   >
      <div class="chat-content">
        <section
          ref="chatArea"
          class="chat-area"
          :class="{ 'area-open': isRotate, 'hide-menu': hideMenu }"
        >
          <h1>AI語音叫車服務</h1>
          <p class="text-center mb-5">智慧出行，隨叫隨到——您的貼心AI叫車助手</p>
          <div v-for="message in messages" class="message-content">
            <!-- 歡迎詞 -->
            <div
              v-if="message.label === 'prologue'"
              ref="prologue"
              class="message d-flex"
              :class="{
                'message-out': message.author === 'user',
                'message-in': message.author !== 'user',
                animate__fadeInRight: message.author === 'user',
                animate__fadeInLeft: message.author !== 'user',
              }"
            >
              <p v-html="message.body"></p>

              <!-- <span v-show="showVoiceItem" class="voice-item">
                <button @click="setVoice('國語')" class="me-3">
                  <p>國語</p>
                  <img src="../assets/img/wireless.png" alt="" width="20" />
                </button>
                <button @click="setVoice('台語')">
                  <p>台語</p>
                  <img src="../assets/img/wireless.png" alt="" width="20" />
                </button>
              </span> -->
            </div>

            <div
              v-if="message.label === 'text'"
              class="message animate__animated"
              :class="{
                'message-out': message.author === 'user',
                'message-in': message.author !== 'user',
                animate__fadeInRight: message.author === 'user',
                animate__fadeInLeft: message.author !== 'user',
              }"
            >
              <p v-html="message.body"></p>

              <div
                v-if="message.author === 'ai' && message.id"
                class="d-flex justify-end like-btn"
              >
                <button @click="toggleLike(message.id)">
                  <img
                    v-if="!likeStatus[message.id]?.isLiked"
                    src="../assets/img/like.png"
                    alt="Like"
                  />
                  <img v-else src="../assets/img/like-solid.png" alt="Liked" />
                </button>
                <button @click="toggleDislike(message.id)" class="mx-2">
                  <img
                    v-if="!likeStatus[message.id]?.isDisliked"
                    src="../assets/img/dislike.png"
                    alt="Dislike"
                  />
                  <img
                    v-else
                    src="../assets/img/dislike-solid.png"
                    alt="Disliked"
                  />
                </button>
              </div>
            </div>

            <div v-if="message.label === 'line'" class="line-item">
              <img
                src="../assets/img/line_oa_qrcode.png"
                alt="Line OA Qrcode"
              />
            </div>

            <!-- 確認掛號按鈕 -->
            <div v-if="message.label === 'btn'" class="confirm-item">
              <button @click="startAppoint()">
                {{ message.body }}
              </button>
            </div>

            <!-- 問題按鈕 -->
            <div v-if="message.label === 'question'" class="confirm-item">
              <button
                @click="
                  userMessage = message.body;
                  sendMessage();
                "
              >
                {{ message.body }}
              </button>
            </div>

            <p
              class="my-5 text-center font-weight-medium"
              v-if="message.label === 'text2'"
              v-html="message.text2"
            ></p>
          </div>
          <!-- <p class="my-5 text-center font-weight-medium"> 請點擊上方錄音按鈕，開始聊天！ </p> -->
        </section>

        <!-- 底部選單 -->
        <div ref="menu" class="menu">
          <div class="d-flex align-center position-relative">
            <div class="w-100 d-flex align-center justify-center">
              <!-- 對話輸入框 -->
              <form
                @submit.prevent="sendMessage()"
                class="chat-inputs"
                :class="{ 'd-none': !showInput }"
              >
                <!-- 文字尺寸按鈕 -->
                <button type="button" @click="toggleFontSizeMenu">
                  <img
                    width="25"
                    src="../assets/img/font-size.png"
                    alt=""
                    class="me-5 pt-1"
                  />
                </button>

                <!-- 文字尺寸選單 -->
                <div v-if="showFontSizeMenu" class="font-size-menu">
                  <ul>
                    <li
                      v-for="size in fontSizes"
                      :key="size"
                      @click="changeFontSize(size)"
                    >
                      {{ size }}
                    </li>
                  </ul>
                </div>

                <input
                  v-model="userMessage"
                  type="text"
                  :placeholder="t('type_message')"
                />

                <!-- 錄音按鈕 -->
                <div v-if="!isRecording" @click="recStart" class="btn-item">
                  <button type="submit" class="submit" :disabled="videoLoading">
                    <img
                      width="25"
                      src="../assets/img/mic.png"
                      alt=""
                      class="me-5 pt-1"
                    />
                  </button>
                </div>
                <div v-else @click="recStop" class="btn-item">
                  <button type="submit" class="submit" :disabled="videoLoading">
                    <img
                      width="25"
                      src="../assets/img/audio.png"
                      alt=""
                      class="me-5 pt-1"
                    />
                  </button>
                </div>

                <button type="submit" class="submit">
                  <img
                    width="20"
                    src="../assets/img/paper-plane-solid.svg"
                    alt=""
                    class="pt-1"
                  />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
main {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* background-color: var(--sub-color); */
  background-color: rgba(0, 0, 0, 0.6);
  background-blend-mode: multiply;
  background-image: url("@/assets/img/banner.jpg");
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
        filter: invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg)
          brightness(103%) contrast(103%);
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

      .btn-item {
        width: 100%;
        height: 100px;
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
      background: var(--sub-color);
      height: 86vh;
      padding: 0 1em 1em;
      overflow-x: hidden;
      overflow-y: auto;
      transition: all 0.3s;

      h1 {
        margin-top: 1rem;
        text-align: center;
        font-size: 2rem;
        font-weight: 600;
        color: var(--main-color);
        letter-spacing: 2px;
      }
    }

    .message-content {
      display: flex;
      flex-direction: column;

      .message {
        max-width: 80%;
        font-size: 1rem;
        border-radius: 20px;
        padding: 0.5em 1.2em;
        position: relative;
        white-space: pre-line;

        &:first-child {
          margin-top: 0;
        }

        @media (max-width: 1280px) {
          max-width: 75%;
          font-size: 1.3rem;
        }

        @media (max-width: 600px) {
          font-size: 0.875rem;
        }

        &.message-out {
          margin-left: auto;
          background: var(--bg-grey);
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
              filter: invert(100%) sepia(84%) saturate(2%) hue-rotate(350deg)
                brightness(110%) contrast(101%);
            }
          }

          img {
            filter: invert(15%) sepia(57%) saturate(4442%) hue-rotate(293deg)
              brightness(88%) contrast(111%);
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
            filter: invert(100%) sepia(32%) saturate(1978%) hue-rotate(187deg)
              brightness(78%) contrast(108%);
          }
        }
      }
    }

    .chat-inputs {
      width: 100%;
      height: 7vh;
      display: flex;
      align-items: center;
      padding: 13px 20px;
      background-color: white;

      input {
        width: 100%;
        border: none;

        &:focus-visible {
          outline: none;
        }
      }

      button {
        border: none;
        background: white;
        cursor: pointer;
        font-size: 16px !important;

        &:hover {
          img {
            opacity: 0.7;
          }
        }

        img {
          // padding-top: 5px;
          object-fit: contain;
          transition: all 0.3s;
          filter: invert(15%) sepia(57%) saturate(4442%) hue-rotate(293deg)
            brightness(88%) contrast(111%);
        }
      }

      ::placeholder {
        font-size: 1.25rem !important;
        font-weight: 500;
        color: var(--sub-color);
        opacity: 1; /* Firefox */
        letter-spacing: 1px;
      }

      ::-ms-input-placeholder {
        /* Edge 12 -18 */
        color: var(--sub-color);
      }

      .font-size-menu {
        position: relative;

        ul {
          position: absolute;
          width: 70px;
          position: absolute;
          top: -310px;
          left: -53px;
          list-style: none;
          background-color: #fff;
          border: 1px solid #ccc;
          border-radius: 5px;
          li {
            padding: 5px;
            cursor: pointer;
            text-align: center;
            border-bottom: 1px solid #ccc;

            &:hover {
              background-color: #f0f0f0;
            }
          }
        }
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

/* 底部選單 */
.menu {
  position: fixed;
  z-index: 300;
  left: 0;
  bottom: 0px;
  right: 0;
  color: var(--text-color);
  background-color: white;
  @media (min-width: 1440px) {
    position: static;
  }
  @media (min-width: 1281px) and (max-width: 1440px) {
    position: static;
  }
  @media (min-width: 1025px) and (max-width: 1280px) {
    position: static;
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
</style>
