console.log("APP CHARGEE");

grist.ready({
  requiredAccess: 'read table'
});

grist.onRecords(records => {

  console.log("DONNEES :", records);

  document.getElementById("nb").textContent =
    records.length;

});
