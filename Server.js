const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const axios = require("axios");
const app = express();
const moment = require("moment");

app.use(cors());

let currentWeek = 0;
let prevWeek = 0;
let gameCount = 0;
let prevCount = 0;
let timeSum = 0;
let weeklyGame = [];
let weeklyPlayTime = [];

const checkWeek = () => {
  currentWeek = moment().week();
};

const checkUpdate = (matches) => {
  gameCount = matches.length; // res.data.matches
  return gameCount > prevCount ? true : false;
};

const playtimeUpdate = (gameLists) => {
  if (prevWeek !== currentWeek) {
    timeSum = 0;
  }
  for (let i = prevCount; i < gameCount; i++) {
    setTimeout(
      () =>
        axios
          .get(
            // 최근전적 리스트 (https://developer.riotgames.com/apis#match-v4/GET_getMatchlist)
            `https://kr.api.riotgames.com/lol/match/v4/matches/${gameLists[i].gameId}`,
            {
              headers: {
                "X-Riot-Token": "RGAPI-fb1c750c-9f46-411c-bbb4-9689a08c37bd",
              },
            }
          )
          .then((res) => {
            timeSum += res.data.gameDuration;
            weeklyPlayTime[currentWeek] = timeSum;
          }),
      i * 1000
    );
  }
};

// 게임 목록중에서 이번 주에 플레이한 게임만 걸러냄 (65번 라인 filter 의 인자 함수)
const getWeeklyGame = (el) => {
  const playWeek = new Date(el.timestamp).toLocaleDateString();
  if (currentWeek === moment(playWeek, "YYYYMMDD").week()) {
    return true;
  }
};

const getWeeklyMatchList = () => {
  axios
    .get(
      // 최근전적 리스트 (https://developer.riotgames.com/apis#match-v4/GET_getMatchlist)
      "https://kr.api.riotgames.com/lol/match/v4/matchlists/by-account/fPzgayIhn1JPjusxEb0AlVCOelgfXotbPGFNkArG-xhWcgPAC1ir_9_l?endIndex=50",
      {
        headers: {
          "X-Riot-Token": "RGAPI-fb1c750c-9f46-411c-bbb4-9689a08c37bd",
        },
      }
    )
    .then((res) => {
      // 이번주 확인
      checkWeek();
      // 업데이트 확인
      if (checkUpdate(res.data.matches.filter(getWeeklyGame))) {
        weeklyGame[currentWeek] = gameCount;
        playtimeUpdate(res.data.matches.filter(getWeeklyGame));
      }
      prevCount = gameCount;
    })
    .catch((err) => console.error(err));
  console.log(weeklyGame[currentWeek]);
  console.log(weeklyPlayTime[currentWeek]);
  return getWeeklyMatchList;
};

app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.listen(5000 || env.PORT, () => {
  console.log("server is running");
  setInterval(getWeeklyMatchList(), 5000);
  // 한시간마다 데이터 갱신
});

app.get("/getWeeklyData", (req, res) => {
  res.send({
    currentWeek: currentWeek,
    currentCount: weeklyGame[currentWeek], // 이번주 판수
    prevCount: weeklyGame[currentWeek - 1]
      ? weeklyGame[currentWeek - 1].length
      : 0, // 지난주 판수
    currentPlayTime: weeklyPlayTime[currentWeek]
      ? weeklyPlayTime[currentWeek]
      : 0,
    prevPlayTime: weeklyPlayTime[currentWeek - 1]
      ? weeklyPlayTime[currentWeek - 1]
      : 0,
  });
});

module.exports.handler = serverless(app);
