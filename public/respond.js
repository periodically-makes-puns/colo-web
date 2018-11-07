/* jshint esversion: 6 */
var id;
$(document).ready(function () {
  id = $("title").html();
  $(document.body).on("keypress", ".entry", function (event) { 
    if (event.which == 13) {
      event.preventDefault();
   }
  });

  $(document.body).on("input", ".entry", function (event) { 
    event.preventDefault();
    let numWords = $(this).val().trim().split(/\s+/g).length;
    if ($(this).val().trim() == "") numWords = 0;
    $(this).siblings().filter(".wc").children().text(`${numWords} word${(numWords == 1) ? "" : "s"}`);
    if (numWords > 10 || numWords == 0) {
      $(this).siblings().filter(".wc").children().removeClass("bg-dark bg-success text-light").addClass("bg-danger text-warning");
      $(this).siblings().filter("button").removeClass("btn-dark btn-success text-light").addClass("btn-danger text-warning");
    } else {
      $(this).siblings().filter(".wc").children().removeClass("bg-dark bg-danger text-warning").addClass("bg-success text-light");
      $(this).siblings().filter("button").removeClass("btn-dark btn-danger text-warning").addClass("btn-success text-light");
    }
  });

  $(document.body).on("submit", "form.response", (event) => {
    event.preventDefault();
  });
  
  $(document.body).on("click", ".submit", (event) => {
    event.preventDefault();
    let body = {"_csrf": $("#csrf").val()};
    $(".entry").each((ind, ele) => {
      if (ele.value.trim()) body[ele.name] = ele.value.trim();      
    });
    $.post(`/user/respond`, body);
    location.reload(true);
  });

  $(document.body).on("click", "#signup", (event) => {
    event.preventDefault();
    $.post('/user/signup', {
      "_csrf": $("#csrf").val(),
    }); 
    location.reload(true);
  });

  $(document.body).on("click", "#logout", (event) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});

