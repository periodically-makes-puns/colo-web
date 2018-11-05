/* jshint esversion: 6 */

$(document).ready(() => {
  $("#signup").click((e) => {
    e.preventDefault();
    $.post('/user/signup', {
      "_csrf": $("#csrf").val(),
    }); 
    location.reload(true);
  });
  $("#respond").click((e) => {
    e.preventDefault();
    location.href='/user/respond';
  });
  $("#vote").click((e) => {
    e.preventDefault();
    location.href='/user/vote';
  });
  $("#logout").click((e) => {
    e.preventDefault();
    location.href = "/user/logout";
  })
});
