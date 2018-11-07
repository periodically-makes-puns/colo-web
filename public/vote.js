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
        otp += $(ele).children().children().children().children().first().children().text();
      });
      $("#votelets").val(otp);
    }
  });

  $(document.body).on("click", "#trigger", (e) => {
    e.preventDefault();
    let vote = $("#votelets").val();
    $.post(`/user/vote`, {
      screenNum: screenNum,
      vote: vote,
      seed: seed,
      "_csrf": $("#csrf").val(),
    });
    window.location.reload(true);
  });
  $(document.body).on("click", ".curr", (e) => {
    location.href = "/user/vote";
  })
  $(".prev").each(function (ind, ele) {
    $(this).data("href", `/user/vote?screenNum=${encodeURIComponent(ns - ind)}`);
  });
  $(document.body).on("click", ".prev", (e) => {
    e.preventDefault();
    location.href = $(e.target).data("href");
    console.log(`Going to ${$(e.target).data("href")}`)
  });
  $(document.body).on("click", "#logout", (e) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});

