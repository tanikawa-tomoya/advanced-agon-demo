(function ()
 {
   'use strict';
   
   class LoginJobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
     }     

     //
     // TODO
     // 
     refresh()
	   {
       // TODO
     }

   }
   
   // Login 名前空間の直下に公開（再定義ガード付き）
   var NS = window.Login || (window.Login = {});   // w.Login が class でも OK（関数はオブジェクト）
   NS.JobView = NS.JobView || LoginJobView;
   
 })(window);
