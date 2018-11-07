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
    $(this).siblings().filter(".wc").html(`<h3 class="response wc">${numWords} word${(numWords == 1) ? "" : "s"}</h3>`);
    if (numWords > 10 || numWords == 0) {
      $(this).parent().parent().css("background-color", "#cc0000");
    } else {
      $(this).parent().parent().css("background-color", "green");
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
<<<<<<< HEAD
    $.post('/user/signup', {"_csrf": $("#csrf").val()}); 
=======
    $.post('/user/signup', {
      "_csrf": $("#csrf").val(),
    }); 
>>>>>>> dbf816a8797885521caabbe2b19450aa63cf2818
    location.reload(true);
  });

  $(document.body).on("click", "#logout", (event) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});

