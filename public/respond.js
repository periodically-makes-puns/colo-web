/* jshint esversion: 6 */
var id;
$(document).ready(function () {
  id = $("title").html();
});

$(document).on("input", ".entry", function (event) { 
  event.preventDefault();
  let numWords = $(this).val().trim().split(/\s+/g).length;
  if ($(this).val().trim() == "") numWords = 0;
  $(this).siblings().filter(".wc").html(`<h3 class="response wc">${numWords} word${(numWords == 1) ? "" : "s"}</h3>`);
  if (numWords > 10 || numWords == 0) {
    $(this).parent().parent().css("background-color", "#cc0000");
  } else {
    $(this).parent().parent().css("background-color", "green");
  }
});

$(document).on("click", ".submit", (event) => {
  $(".entry").each((ind, ele) => {
    let body = {};
    body[ele.name] = ele.value.trim();
    $.post(`/user/${id}/respond`, body);
  });
  location.reload(true);
});