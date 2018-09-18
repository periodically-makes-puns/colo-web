/* jshint esversion: 6 */
var id;
$(document).ready(function () {
  id = $("title").html();
  $(".entry").keypress(function (event) { 
    if (event.which == 13) {
      event.preventDefault();
   }
  });

  $(".entry").on("input", function (event) { 
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

  $("form.response").submit((event) => {
    event.preventDefault();
  });
  
  $(".submit").click((event) => {
    event.preventDefault();
    let body = {};
    $(".entry").each((ind, ele) => {
      if (ele.value.trim()) body[ele.name] = ele.value.trim();      
    });
    $.post(`/user/respond`, body);
    location.reload(true);
  });

  $(".signup").click((event) => {
    event.preventDefault();
    $.post('/user/signup'); 
    location.reload(true);
  });

  $("#logout").click((event) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});

