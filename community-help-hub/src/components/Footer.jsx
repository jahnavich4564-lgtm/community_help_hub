import {
  HeartHandshake,
  Mail,
  Phone,
  MapPin,
  Globe,
} from "lucide-react";


export default function Footer() {

  return (

    <footer className="
      bg-gray-900
      text-white
      px-6
      py-10
      mt-10
    ">


      <div className="
        max-w-7xl
        mx-auto
        grid
        grid-cols-1
        md:grid-cols-3
        gap-8
      ">


        {/* Brand Section */}

        <div>


          <div className="
            flex
            items-center
            gap-3
            text-2xl
            font-bold
          ">


            <div className="
              bg-blue-600
              p-3
              rounded-xl
            ">

              <HeartHandshake size={28}/>

            </div>


            Community Help Hub


          </div>



          <p className="
            text-gray-400
            mt-4
            leading-relaxed
          ">

            An AI-powered platform connecting people who need help
            with people who can provide support.

          </p>


        </div>







        {/* Quick Links */}

        <div>


          <h3 className="
            text-lg
            font-semibold
            mb-4
          ">

            Quick Links

          </h3>



          <ul className="
            space-y-3
            text-gray-400
          ">


            <li className="
              hover:text-white
              cursor-pointer
            ">

              Home

            </li>


            <li className="
              hover:text-white
              cursor-pointer
            ">

              Communities

            </li>


            <li className="
              hover:text-white
              cursor-pointer
            ">

              Request Help

            </li>


            <li className="
              hover:text-white
              cursor-pointer
            ">

              Offer Help

            </li>


            <li className="
              hover:text-white
              cursor-pointer
            ">

              AI Assistant

            </li>


          </ul>


        </div>







        {/* Contact */}

        <div>


          <h3 className="
            text-lg
            font-semibold
            mb-4
          ">

            Contact Us

          </h3>




          <div className="
            space-y-4
            text-gray-400
          ">


            <p className="
              flex
              items-center
              gap-3
            ">

              <Mail size={18}/>

              support@communityhelphub.com

            </p>




            <p className="
              flex
              items-center
              gap-3
            ">


              <Phone size={18}/>

              +91 XXXXX XXXXX


            </p>





            <p className="
              flex
              items-center
              gap-3
            ">


              <MapPin size={18}/>

              India


            </p>





            <p className="
              flex
              items-center
              gap-3
            ">


              <Globe size={18}/>

              www.communityhelphub.com


            </p>



          </div>



        </div>



      </div>







      {/* Bottom */}

      <div className="
        max-w-7xl
        mx-auto
        border-t
        border-gray-700
        mt-10
        pt-6
        text-center
        text-gray-400
      ">


        © 2026 Community Help Hub.
        Built with AI for community support.


      </div>



    </footer>

  );

}