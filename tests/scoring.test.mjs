import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { classifyScore, getStatistics, validateImport, normalizeName } from '../lib/scoring.mjs';
import { parseExcel } from '../lib/excel.mjs';
test('missing, zero, absent and nonparticipants stay distinct', () => {
  assert.equal(classifyScore(null).status,'pending');
  assert.equal(classifyScore('').score,null);
  assert.deepEqual(classifyScore(0),{score:0,status:'scored',error:''});
  assert.equal(classifyScore(' 0 ').status,'scored');
  assert.equal(classifyScore('请假').status,'absent');
  assert.equal(classifyScore('不参培').status,'excluded');
  assert.equal(classifyScore(151,150).status,'invalid');
  assert.equal(classifyScore('100分').status,'invalid');
});
test('competition rank and strict-lower percentile handle ties and zero', () => {
  const records=[100,90,90,0].map((score,i)=>({id:String(i),score,status:'scored'}));
  records.push({id:'absent',score:null,status:'absent'},{id:'pending',score:null,status:'pending'});
  assert.deepEqual(getStatistics(records,records[1]),{rank:2,percentile:25,topPercent:50,total:4,tied:2});
  assert.equal(getStatistics(records,records[3]).rank,4);
  assert.equal(getStatistics(records,records[3]).percentile,0);
  assert.equal(getStatistics(records,records[4]).rank,null);
  assert.equal(getStatistics([records[0]],records[0]).percentile,0);
});
test('server validation rejects missing score, invalid publication and duplicate ids',()=>{
  const base={exam:{title:'测试',maxScore:150},records:[{id:'r1',name:'示例老师',status:'scored',score:0}],publish:true};
  assert.equal(validateImport(base).records[0].score,0);
  assert.throws(()=>validateImport({...base,records:[{...base.records[0],score:null}]}));
  assert.throws(()=>validateImport({...base,records:[{...base.records[0],status:'pending',score:null}]}));
  assert.throws(()=>validateImport({...base,records:[base.records[0],base.records[0]]}));
  assert.equal(normalizeName(' 张　老师 '),'张老师');
});
test('XLSX import ignores duplicate summary and uses venue input instead of stale cached formula',async()=>{
  const w=new ExcelJS.Workbook();
  const room=w.addWorksheet('3教室'); room.addRow(['姓名','部门','科一 全真模拟\n11/24 周二\n满分150']); room.addRow(['测试甲','甲部门',0]); room.addRow(['同名测试','甲部门',90]); room.addRow(['测试缺考','甲部门','缺考']);
  const room2=w.addWorksheet('4教室');room2.addRow(['姓名','部门','科一 全真模拟\n11/25 周三\n满分150']);room2.addRow(['同名测试','乙部门',90]);room2.addRow(['测试待录','乙部门',null]);room2.addRow(['测试不参','乙部门','不参培']);
  const total=w.addWorksheet('总成绩');total.addRow(['姓名','部门','科一 全真模拟\n11/24 / 11/25\n满分150']);total.addRow(['测试甲','甲部门',{formula:"'3教室'!C2",result:999}]);
  const data=await parseExcel(await w.xlsx.writeBuffer());
  assert.equal(data.exams.length,1);assert.equal(data.exams[0].records.length,6);assert.equal(data.exams[0].duplicateNames,1);
  assert.equal(data.exams[0].records[0].score,0);assert.equal(data.exams[0].errors.length,0);assert.deepEqual(data.exams[0].dates,['2026-11-24','2026-11-25']);
});
test('actual organizer workbook imports all eight exams without double counting',async()=>{
  const path=new URL('../../06_成绩与参培信息/2026下半年教资培训考试登分表.xlsx',import.meta.url);
  try{await fs.access(path);}catch{return;}
  const data=await parseExcel(await fs.readFile(path));
  assert.equal(data.exams.length,8);assert.equal(data.sourceSheets.length,6);
  for(const exam of data.exams)assert.equal(exam.records.length,129);
  assert.ok(data.warnings.some(w=>w.includes('129')&&w.includes('128')));
  const today=data.exams.find(e=>e.title==='科一 全真模拟');assert.ok(today);assert.equal(today.maxScore,150);assert.equal(today.errors.length,0);
  assert.equal(today.records.filter(r=>r.status==='scored').length,0);assert.equal(today.records.filter(r=>r.status==='pending').length,92);assert.equal(today.records.filter(r=>r.status==='excluded').length,37);
});
