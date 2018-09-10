/* jshint esversion: 6 */

$(document).ready(() => {
  $("#signup").click(() => {
    $.post('/user/signup'); 
    location.reload(true);
  });
  $("#respond").click(() => {
    location.href='/user/respond';
  });
  $("#vote").click(() => {
    location.href='/user/vote';
  });
  $("#logout").click(() => {
    e.preventDefault();
    $.post("/user/logout");
  })
});