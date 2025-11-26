(function ()
 {
   'use strict';
   
   class LoginJobHelp
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
     }

     //
     // ヘルプモーダルを開く
     // 
     open()
	   {
       // TODO
     }

     //
     // ヘルプモーダルを閉じる
     // 
     close()
	   {
       // TODO       
     }     
   }
   
   // Login 名前空間の直下に公開（再定義ガード付き）
   var NS = window.Login || (window.Login = {});   // window.Login が class でも OK（関数はオブジェクト）
   NS.JobHelp = NS.JobHelp || LoginJobHelp;
   
 })(window);
