/* jshint esversion: 6 */
let id;
let screenNum;
let seed;
$(document).ready(() => {
  id = $("body").data("id");
  screenNum = $("body").data("num");
  seed = $("body").data("seed");
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
    let vote = $("#votelets").val();
    $.post(`/user/${id}/vote`, {
      screenNum: screenNum,
      vote: vote,
      seed: seed,
    });
    window.location.href = `/user/${id}/vote`;
  });
});

