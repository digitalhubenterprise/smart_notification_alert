import fetch from "node-fetch";

async function test() {
  const res = await fetch("http://localhost:3000/api/admin/backup/cyberpanel/test", {
    method: "POST"
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
test();
