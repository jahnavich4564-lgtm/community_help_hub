import React from "react";
export default class ErrorBoundary extends React.Component{
 state={error:null};
 static getDerivedStateFromError(error){return {error};}
 render(){if(this.state.error)return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="max-w-xl bg-white rounded-2xl shadow p-8 text-center"><h1 className="text-2xl font-bold text-red-600">This page could not be displayed</h1><p className="text-gray-600 mt-3">The application hit a frontend error. Refresh the page and check that the backend is running on port 5000.</p><pre className="text-left text-xs bg-gray-100 p-3 rounded-xl mt-5 overflow-auto">{this.state.error?.message}</pre><button onClick={()=>window.location.reload()} className="mt-5 bg-blue-600 text-white px-5 py-3 rounded-xl">Refresh</button></div></div> ;return this.props.children;}
}
