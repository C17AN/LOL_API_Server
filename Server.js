const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const moment = require("moment");

app.use(cors());

const currentWeek = moment().week();
let weeklyGame = [];
let weeklyPlayTime = [];
let playTime = 0;

const getWeeklyGame = (el) => {
  const playWeek = new Date(el.timestamp).toLocaleDateString();
  return currentWeek === moment(playWeek, "YYYYMMDD").week(); // 1년 중 몇번째 주인지
};

const getWeeklyPlayTime = async (weeklyGame) => {
  let promises = [];
  weeklyGame.forEach((game) => {
    promises.push(
      axios.get(
        `https://kr.api.riotgames.com/lol/match/v4/matches/${game.gameId}`,
        {
          headers: {
            "X-Riot-Token": "RGAPI-99172655-e0d3-4b18-be39-72a48a390896",
          },
        }
      )
    );
  });
  Promise.all(promises).then((res) =>
    res.forEach((el) => (playTime += el.data.gameDuration))
  );
};

const getWeeklyMatchList = async () => {
  await axios
    .get(
      // 최근전적 리스트 (https://developer.riotgames.com/apis#match-v4/GET_getMatchlist)
      "https://kr.api.riotgames.com/lol/match/v4/matchlists/by-account/fPzgayIhn1JPjusxEb0AlVCOelgfXotbPGFNkArG-xhWcgPAC1ir_9_l?endIndex=20",
      {
        headers: {
          "X-Riot-Token": "RGAPI-99172655-e0d3-4b18-be39-72a48a390896",
        },
      }
    )
    .then(
      (res) =>
        (weeklyGame[currentWeek] = res.data.matches.filter(getWeeklyGame))
    )
    .catch((err) => console.error(err));
};

app.listen(5000 || env.PORT, async () => {
  console.log("server is running");
  await getWeeklyMatchList();
  await getWeeklyPlayTime(weeklyGame[currentWeek]);
  // 한시간마다 데이터 갱신
});

app.get("/getWeeklyData", (req, res) => {
  res.send({
    currentCount: weeklyGame[currentWeek].length,
    prevCount: weeklyGame[currentWeek - 1].length,
    currentTime: 0,
    prevTime: 0,
  });
});

setTimeout(() => {
  console.log(playTime);
  console.log(weeklyGame[currentWeek].length);
}, 3000);
