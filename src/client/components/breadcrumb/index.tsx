// import { useBreadcrumb } from "../../hooks";

// const Breadcrumb = () => {
//   const breadcrumbItems = useBreadcrumb();

//   return (
//     <nav aria-label="Breadcrumb">
//       <ol className="breadcrumb">
//         <li className="breadcrumb-item">
//           <a href="/">Home</a>
//         </li>
//         {breadcrumbItems.map((item, index) => (
//           <li 
//             key={item.path} 
//             className={`breadcrumb-item ${index === breadcrumbItems.length - 1 ? 'active' : ''}`}
//           >
//             {index === breadcrumbItems.length - 1 ? (
//               <span>{item.label}</span>
//             ) : (
//               <a href={item.path}>{item.label}</a>
//             )}
//           </li>
//         ))}
//       </ol>
//     </nav>
//   );
// };

// export default Breadcrumb;
