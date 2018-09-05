/* jshint esversion: 6 */

$(document).ready(() => {
  $("#signup").click(() => {
    $.post('/user/signup'); 
    location.reload();
  });
  $("#respond").click(() => {
    location.href='./respond';
  });
  $("#vote").click(() => {
    window.location.href='./vote';
  });
});