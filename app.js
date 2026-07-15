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
