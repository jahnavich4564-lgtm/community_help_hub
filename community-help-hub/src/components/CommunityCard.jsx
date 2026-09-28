import { MapPin, Users, ShieldCheck } from "lucide-react";

import { Link } from "react-router-dom";



export default function CommunityCard({

name,
location,
admin,
members,
type

}) {



return (


<div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition duration-300">



{/* Community Name */}

<h2 className="text-2xl font-bold text-gray-800">

{name}

</h2>





{/* Location */}


<div className="flex items-center gap-2 mt-4 text-gray-600">


<MapPin

size={18}

className="text-blue-600"

/>


<span>

{location}

</span>


</div>





{/* Members */}


<div className="flex items-center gap-2 mt-3 text-gray-600">


<Users

size={18}

className="text-green-600"

/>


<span>

{members} Members

</span>


</div>






{/* Community Type */}


<div className="mt-4">


<span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm">

{type}

</span>


</div>






{/* Admin */}


<div className="flex items-center gap-2 mt-5 text-gray-700">


<ShieldCheck

size={20}

className="text-purple-600"

/>



<p>

Admin:

<strong className="ml-1">

{admin}

</strong>


</p>


</div>








{/* Service Buttons */}


<div className="grid grid-cols-2 gap-3 mt-6">



<Link


to="/free-services"


className="bg-green-600 text-white text-center py-3 rounded-full hover:bg-green-700 transition"


>


🤝 Free Help


</Link>





<Link


to="/paid-services"


className="bg-orange-500 text-white text-center py-3 rounded-full hover:bg-orange-600 transition"


>


💰 Paid Services


</Link>



</div>







{/* Join Community */}


<Link


to="/community-dashboard"


className="block text-center mt-4 w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition"


>


Join Community


</Link>




</div>


)


}