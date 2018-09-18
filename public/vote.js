/* jshint esversion: 6 */
let id;
let screenNum;
let seed;
let ns;
$(document).ready(() => {
  id = $("body").data("id");
  screenNum = $("body").data("num");
  seed = $("body").data("seed");
  ns = $("body").data("ns");
  $("#currscreen").sortable({
    stop: (e) => {
      let otp = "";
      $("#currscreen").children().each((ind, ele) => {
        otp += $(ele).children().children().first().children().text();
        console.log($(ele).html());
      });
      $("#votelets").val(otp);
    }
  });

  $("#trigger").click((e) => {
    e.preventDefault();
    let vote = $("#votelets").val();
    $.post(`/user/vote`, {
      screenNum: screenNum,
      vote: vote,
      seed: seed,
    });
    location.reload(true);
  });
  $(".curr").click((e) => {
    location.href = "/user/vote";
  })
  $(".prev").each(function (ind, ele) {
    $(this).click((e) => {
      location.href = `/user/vote?screenNum=${encodeURIComponent(ns - ind)}`;
    });
  });
  $("#logout").click((e) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});

