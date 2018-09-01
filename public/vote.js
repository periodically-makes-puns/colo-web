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
    let vote = "";
    $("h3.vl").each(() => {
      vote += $(this).text();
    });
    $.post(`/user/${id}/screenNum=${screenNum}&seed=${seed}&vote?vote=${vote}`);
    window.location.href = `/user/${id}/vote`;
  });
});

