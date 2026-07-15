console.log("APP CHARGEE");
console.log(typeof grist);
grist.ready({
  requiredAccess: "read table"
});

grist.onRecords(records => {

  console.log("DONNEES RECUES :", records);

  alert(
    "Nombre de lignes : " +
    records.length
  );

});
