$(document).ready(function () {

    var navListItems = $('div.setup-panel div a'),
            allWells = $('.setup-content'),
            allNextBtn = $('.nextBtn');

    allWells.hide();

    navListItems.click(function (e) {
        e.preventDefault();
        var $target = $($(this).attr('href')),
                $item = $(this);

        if (!$item.hasClass('disabled')) {
            navListItems.removeClass('btn-primary').addClass('btn-default');
            $item.addClass('btn-primary');
            allWells.hide();
            $target.show();
            $target.find('input:eq(0)').focus();
        }
    });

    allNextBtn.click(function(){
        var curStep = $(this).closest(".setup-content"),
            nextStepWizard = $('div.setup-panel div a[href="#' + curStep.attr("id") + '"]').parent().next().children("a");

        if(curStep.attr("id") == "step-2"){
        	$(".aadhaarBox").val($("#aadharInput").val());
        }else if(curStep.attr("id") == "step-3"){
        	eKYC();
        }

        if (validateForm(curStep)){
        	 nextStepWizard.removeAttr('disabled').trigger('click');
             $("#squarespaceModal").scrollTop(0);
        }
    });

    $('#finalBtn').click(function (e) {
    	var curStep = $(this).closest(".setup-content");
    	 if (validateForm(curStep)){
    		 eSign();
    	 }
    });

    function validateForm(curStep){
        var curInputs = curStep.find("input[type='text'],input[type='url'],input[type='number'],input[type='checkbox']"),
        isValid = true, isReadonly = false;

	    $(".form-group").removeClass("has-error");
	    for(var i=0; i<curInputs.length; i++){
	    	isReadonly = false;
	    	if($(curInputs[i]).prop("readonly")){
	    		isReadonly = true;
	    		$(curInputs[i]).prop("readonly", false);
	    	}
	        if (!curInputs[i].validity.valid){
	            isValid = false;
	            $(curInputs[i]).closest(".form-group").addClass("has-error");
	        }
	        if(isReadonly){
	        	$(curInputs[i]).prop("readonly", true);
	        }
	    }
	    return isValid;
    }

    $('div.setup-panel div a.btn-primary').trigger('click');
});


function showModal(){
	$('#squarespaceModal').modal('show');
}

function eKYCOTP(){
	$("#ekycOtp").removeAttr('readonly');
}

function eSignOTP(){
	$("#esignOtp").removeAttr('readonly');
}

function eKYC(){
	generatePdf();
}

function eSign(){
	 $('#squarespaceModal').modal('hide');
     alert("Application submitted successfully!");
}

function generatePdf(){
	var doc = new jsPDF();
    var junkText = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam posset, eveniunt specie deorsus efficiat sermone instituendarum fuisse veniat, eademque mutat debeo. Delectet plerique protervi diogenem dixerit logikh levius probabo adipiscuntur afficitur, factis magistra inprobitatem aliquo andriam obiecta, religionis, imitarentur studiis quam, clamat intereant vulgo admonitionem operis iudex stabilitas vacillare scriptum nixam, reperiri inveniri maestitiam istius eaque dissentias idcirco gravis, refert suscipiet recte sapiens oportet ipsam terentianus, perpauca sedatio aliena video.';

    doc.setFontSize(30);
    doc.text(45, 25, "Open Financial Bank");
    doc.line(10, 30, 180, 30);
    doc.setFontSize(25);
    doc.text(45, 40, "Application for Home Loan");
    doc.setFontSize(16);
    doc.text(20, 60, 'Applicant Name: ' + $("#nameInput").val());
    doc.text(20, 70, 'DOB: ' + dummyKycData.dob);
    doc.text(20, 80, 'Gender: ' + dummyKycData.gender);
    doc.text(20, 90, 'Phone: ' + $("#phoneInput").val());
    doc.text(20, 100, 'Email: ' + dummyKycData.email);
    doc.text(20, 110, 'Address: ' + dummyKycData.address.street + ", " + dummyKycData.address.locality + ",");
    doc.text(44, 116, dummyKycData.address.district + ", " + dummyKycData.address.state + ", " + dummyKycData.address.pincode);


    doc.addImage(dummyKycData.image, 'JPEG', 150, 50, 40, 40);

    doc.addPage();
    doc.setFontSize(25);
    doc.text(20, 20, "Terms & Conditions");
    doc.line(10, 30, 180, 30);
    doc.setFontSize(16);
    doc.text(20, 40, doc.splitTextToSize(junkText + "\n\n" + junkText, 180));

    doc.addPage();
    doc.setFontSize(25);
    doc.text(20, 20, "Declaration");
    doc.line(10, 30, 180, 30);
    doc.setFontSize(16);
    doc.text(20, 40, doc.splitTextToSize(junkText + "\n\n" + junkText, 180));

    $("#embedPdf").attr('data', doc.output('datauristring'));
}

var dummyKycData = {
	name : 'Krishna Kumar',
	dob  : '04-05-1978',
	gender : 'M',
	phone  : '2314475929',
	email  : 'krk@mailserver.com',
	address : {
		street : 'B 101 Amar CHS Ltd',
		locality : 'Bandra West',
		district : 'Mumbai',
		state : 'Maharashtra',
		pincode : 400001
	},
	image : 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAEKgD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCIFhZWiAH3AABABkAAwApADlhY3NwQVBQTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWxjbXMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApkZXNjAAAA/AAAAF5jcHJ0AAABXAAAAAt3dHB0AAABaAAAABRia3B0AAABfAAAABRyWFlaAAABkAAAABRnWFlaAAABpAAAABRiWFlaAAABuAAAABRyVFJDAAABzAAAAEBnVFJDAAABzAAAAEBiVFJDAAABzAAAAEBkZXNjAAAAAAAAAANjMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB0ZXh0AAAAAEZCAABYWVogAAAAAAAA9tYAAQAAAADTLVhZWiAAAAAAAAADFgAAAzMAAAKkWFlaIAAAAAAAAG+iAAA49QAAA5BYWVogAAAAAAAAYpkAALeFAAAY2lhZWiAAAAAAAAAkoAAAD4QAALbPY3VydgAAAAAAAAAaAAAAywHJA2MFkghrC/YQPxVRGzQh8SmQMhg7kkYFUXdd7WtwegWJsZp8rGm/fdPD6TD////bAEMACAYGBwYFCAcHBwkJCAoMFA0MCwsMGRITDxQdGh8eHRocHCAkLicgIiwjHBwoNyksMDE0NDQfJzk9ODI8LjM0Mv/CAAsIASwBLAEAEQD/xAAbAAEAAwEBAQEAAAAAAAAAAAAABQYHBAMCAf/aAAgBAAAAAAG2AAAAAAAAAAAAAAAflZgfGSmpz7AAAABW6VGB13uzAAAACo0EAntE6gAAAIHM/kAdupdoAAAMwggATeogAABz478gAarLgAACr52AAvdxAAAFLo4AC238AAAUKoAALLo4AAAoVQAATungAACj0sABI62AAAKZRgAEjrYAAAoFSAATungAADLIYAB26+AAAMthQAEvqoAAAplGAAXq5AAAD5zKCABNab6gAABGZMAC+XAAAAHzjPmAGqTAAAAFEpwAm9RAAAAR+RgC5XoAAABHZIALvdQAAAEZkwAu91AAAA56BWgB1a10AAAB4ZlDgAuN6/QAAPOEgKzzgAJW7WD9AAcUBAQfkAABJ22z+oDziIGAiwAAAPe0W2QDMIX4AAAAB+z1wnTEwAAAAAm7vNYmAAAAABLRIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8QALRAAAQQCAQEGBAcAAAAAAAAAAwECBAUwQAARBhITFCIzICMxUBUhJDQ1YHD/2gAIAQAAAQUC/rf0STdBC595JdxtzMTg793BXEQnGua9N6XcBAsmceUvwgkFjvh3Aj7trZeGmGFZliqA45I9m0mrEAq9VxR5JIpYslkoGxan8edkrJSxpeuYqBCq9Vy1sjzEHWvCK2JmoH/K1r93pzUK/qta/wDezUi9J+tf+9mqF6WWtfp6s0EqBm63aBPTmgj8WdrXpu8fNT9PxLWtV62WaI5WS9a1YrLHNWj8Ww1ryK52eiB0brKiObY16wyZK6F5wwxtEzXsGeJAyUDPk7Dk7zXtVj8dYBY8HZu4ndfiq43mZm1ORFgYqD3Nqd+wxdn0/LasP4/FQPbtGMMA7C0dKxgM6OYJWnDrlMMLLCasw+SmmsEmo57WIa4iC4a9K7hTEM/NGsJEXkW3jn0Cy44OGvQt4a4lk48jyO048+RG5HvBP4wjCtwOe1iFtYYuGvncNYSj7QykC6PevbyPNjyfiPbSjq5znLvfTke3kg5FtY8j7PFs5EbkWzjyvs47KWJn+ff/xAA1EAACAAMFBAgFBAMAAAAAAAABAgADERIhMDFAIiNRYQQTMkFCUnFyUGKBobEgM0ORYHDB/9oACAEAAAY/Av8AG6mLMsdaeIN0bKov0i9lb1WN7JB9pi9ih+YRVWBHEa8pL3j/AGjePs+UZfqtSnKmAk7dv9jrT0eSdvxNwwgp25XlPdFuW1R+NUAn7j5coqcO3Lb1HGBMT6jhqWp2U2RirU7t7m1DzGyUVgk9+MjHtDZOnVB42vx50vgQdPIT1OPMHyaeT7cf1Q6eT7ceXzr+NPIPI48qY2QN+nkH1x5KHK1p0kjwCpx5dedP60876fjHklc7Y082vffjyhwNr+tOvSV8Io2PM6Qe/ZGnKkVBiq3ymyPDFIJoi3tARFooyGonL8tcWc/Fqakg5GGU5g0xEVu020dUOkqLmubDFewm0dXPqPAcOeeQ1c/2HD6Qfb/3Vz/bhzkrtZ6q3NYKsdXLqsr7nDWamaws1MmGotTHCjnFf4x2RitImuFGak6WrsFHEmLmMw/KIpKlqnM3xamOWPPH2GqvlbKLL7t+eWg3k1V5d8bqWz+t0bLCWPlEVdix5nSbuZs+U5RSevVniLxFqWwYcRg1Zgo5mP3LZ4JfG5kgc2jbnNTgLtValuVPKKdIS2PMucbuYK+U5/qufq14JFWJJ5/AKFusXg0WSerfg3welbaeVopWw/lb4PZWcac7/wDX/wD/xAAqEAABAQYFBAIDAQAAAAAAAAABEQAhMDFAUUFhcZGhgbHB4dHwIFBgcP/aAAgBAAABPyH+bJBCAATJY0TlhvxZ3C8lHluFQ8MK7NkuCxsAu+yhgk5yIorwIIuKOA6s83Y7/JcUFjqGdBv/AGStnQnCw2GcIuJuD9BYNGPO5WNUlw9BWYliGISS8kwxxMegFixN3F2IVqlPkvBT5ihREiWGR6VE7p6mNPRKYxnxetyPop5dmwD46vsKPVPrg9iOndq2I+aflO8ddFh2NPyneOm7B5U6d+HZPmOTRH1kXU6luR7fEcUwAJ0D/FOvh3UD67x82J1lU6jzDhHkVO5T3DQPUR7ZLuVOEBUIdgrjzHTS/Y4+NqcaIJCDiGeaK+IYrnHggmcgwLwqAqHPYw6P8RULS2D3UhkIQsFtCiER2A4LL6SqyUhwOBho0V6jYVYFEQu+6OhjoA96s0+86H1AFWNNbDBE1IAXFUVCjEsrX15csoZ7Hy6izH8nBlUEV9yZPFDnzaxShiVRy4hphRSaXlQZSFseaTKwRdUxFfMo6SEXO9GRC5RvdWmFEdZXhcuybKgMXcMqixH25bMVqxpEMERmsTDfrGIYcN+KsHOyiDcbDukxajMFeAygFDJcVWeVyRkoTQNkuzAXzSbPyMFMIiczbMRRLXgklBQhkrdbuxUKDGcdD+nRRS4ktDgyQK3raHH9OAJeSB3f5/8A/9oACAEAAAAAEAAAAAAAAAAAAAAADIAAAACAAAAABAAAAAAwAwAAAAAEAAAGAAAAAAAAIAAAQAAAAAEAAAAABAAAAAAAAAAAAAAAgAABAAIAAAAACAAAAAAAAABAAAAAAIAAAAAAABAAAAQAAAAAEAIAAAAACAAAAQAgAAAAAIAAACABAAABgAIAADAACgAAAAAMAZAAAAwMAAAACAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//xAArEAEAAQEIAgEEAgMBAAAAAAABESEAMUBBUWGBkTBxoVCxwdEg4WBw8PH/2gAIAQAAAT8Q/wAbPA0ogDe0JvVKDoQehG9pnIZTuUfFn52c34WitUNj2T3bJjJGTyBylrvthp6SmPbS1kQ2Tm9E+yz8BOaD4z9sv8j+XAZHS4T3aEDaDamy3tnuwiSMjjLq7kbzM1ZuXu7wnNTDQHxervV9qd8BdoDJxSghlsgudSQPe1lgsoSq3q+NzhIJxjM+2Vs1Ilo71/1SHE6YDWk3nZ4DyuwEU0TTlN+k4i8eCTkKHtYObLhLE1Vl8zbstjka+0V7cOzcFHqFHcPHnm5uw9w/bhxCXr7QA+7156h6f0vozasv738H0bat0CPZ+MOea92fnJSHAJgFPE4dci74fnB5IXrUHWHQuMWOMfQHzqiwFZn+hOH2E6g/jzzlUk1kCcjHOHIqhLqD9mTjztHrMdAQ+QOcPG1whWQ+mUPHnv0WdMkL5YcsO8IR0iEI2irXjVX3tHM58rZbgAWmgsNcrQMKDQP3vniL9iBb0/KpTmfNiYfSstRIbPmWIhEYfIOChcXowewS3xV8dBjJ+QI9hr4xGwQt0H5GOBxZwEQGRK4QePHP/YR/TFzDZ7Xjg1nQ/ti5jtd+NygduSIp6U7MVQkpLVdAvXYsaQbfY4V3/pt4om1CWmctkktKoNNesx3GR9YgMx00ugXrsWSOut0ze74IPLSUDkFSRoTROdbCAgiSJnhH5VeAuW0Ct1R2jotiExQR7woHI2ZLdVBoFwbHnel9Wbiz4Jaqx0vRtd7jmwgIIkiZ+eMX5L4mfhaHX3OfnXotKoaZByPUWYP17O5wjqlP6tu4i0lUoyr7P2e7XREgj4z8KE4vMe2xiRDcP+NbQrOT38AdthgV89PRITzNplriYVNm5bOps2i5FED3N5xYDnxLQ+VX2SfyIM8I+b55Dayt+venlx4FyJEYRsiYFJVBtf7k2summBCdLzDt9HyntOQdn2bWye9KCuj7tvo+RcJANJCxt/r/AP/Z'
};



